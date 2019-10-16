import puppeteer, {Browser, Page} from 'puppeteer';
import {AxePuppeteer} from 'axe-puppeteer';
import {AxeResults} from 'axe-core';
import cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';
import {promisify} from 'util';
import matchit from 'matchit';
import {logger} from './logger';
import * as streaming from './streaming';

// Create a child logger scoped to the module
const log = logger.child({module: 'core'});

// Promise-friendly core fns
const readFile = promisify(fs.readFile);

// TODO: Source-map-support
// TODO: Add non-crawl option
// TODO: Add multiple roots
// TODO: For multiple roots and crawling, what do we do?

// TODO: more granular error boundaries, and error reporting
// for example {..., fetcherErrors: [{url: ..., reason: ...}]}
// - "Friends don't let friends not handle errors"

// TODO: Consider AxE reporting verbosity toggle
// TODO: Ability to set a UA to hide from analytics

// Common options for excluding links to visit
// For example *.pdf and #heading-link came up often in early iterations
export type Options = {
  /* The maximum number of pages to visit */
  pageLimit: number;
  /* The maximum number of retries for a failing page */
  maxRetries?: number;
  /* Whether to ignore links of the shape https://example.com#my-id */
  ignoreFragmentLinks?: boolean;
  /* A list of extensions to ignore, skipping pages */
  ignoreExtensions?: Array<string>;
  /* A path to a route manifest file, used to de-duplicate visited pages and routes */
  routeManifestPath?: string;
  /* Whether to expose the streaming logging API, used for advanced, "live" reporters */
  streaming?: boolean;
  /* List of Chromium flags for Puppeteer launch */
  puppeteerChromeLaunchArgs?: puppeteer.LaunchOptions['args'];
};

type CoreReturnValue =
  | {type: 'state'; data: StateData}
  | {type: 'results'; data: AxeResults};

type StateData = {
  entry: string;
  options: Options;
  run: number;
  routes: any;
  pagesVisited: string[];
  routesVisited: string[];
  toVisit: string[];
};

const defaultOpts: Partial<Options> = {
  maxRetries: 5,
  puppeteerChromeLaunchArgs: [],
};

/**
 * Runs the assertions at the URL with options, and returns them all at once.
 *
 * This version is simpler to use (you await it), but it might have memory
 * pressure issues.
 *
 * An alternative is runCoreStreaming, which returns results one-at-a-time.
 */
export async function runCore(rootURL: URL, opts: Options) {
  let state: StateData | {} = {};
  let results: AxeResults[] = [];

  // What a syntax!
  for await (const msg of runCoreStreaming(rootURL, opts)) {
    if (msg.type === 'state') {
      state = msg.data;
    }
    if (msg.type === 'results') {
      results.push(msg.data);
    }
  }
  return {state, results};
}

/**
 * Runs the assertions at the URL with options, and returns them one-at-a-time,
 * as an async iterable.
 *
 * This version allows you to process results at your own pace, which can be
 * good for memory pressure, as well as implementing other streaming interfaces
 * on top.
 *
 * An alternative is runCore, which buffers / collects the results instead.
 *
 * @see https://2ality.com/2016/10/asynchronous-iteration.html
 * @see http://javascript.info/async-iterators-generators
 */
export function runCoreStreaming(rootURL: URL, opts: Options) {
  return {
    [Symbol.asyncIterator]() {
      return runCoreStreamingInternal(rootURL, opts);
    },
  };
}

/**
 * The core function that runs assertions on the provided URLs,
 * but does not touch the filesystem.
 *
 * It returns results one-at-a-time, using generators.
 *
 * @see https://2ality.com/2016/10/asynchronous-iteration.html
 * @see http://javascript.info/async-iterators-generators
 */
async function* runCoreStreamingInternal(
  rootURL: URL,
  opts: Options
): AsyncGenerator<CoreReturnValue> {
  // Merge default options
  opts = {...defaultOpts, ...opts};

  // Load RouteManifest, if specified
  // TODO: Consider a union for this
  let ROUTE_MANIFEST;
  if (opts.routeManifestPath) {
    // Read the manifest specified
    try {
      ROUTE_MANIFEST = await readFile(opts.routeManifestPath, 'utf8').then(
        data => JSON.parse(data)
      );
    } catch (err) {
      log.error('There was an error when trying to read the route manifest');
      throw err;
    }
    log.info('Read manifest!');
    log.debug(JSON.stringify(ROUTE_MANIFEST, null, 2));
    // TODO: Validate the format
  }

  // TODO: Make a "pages considered" list as well
  const PAGES_VISITED = new Set<string>();
  const ROUTES_VISITED = new Set<string>();

  // It is preferable to store a string in the set, otherwise identities get jumbled with objects...
  // Wish there was a good hashed set implementation
  // To compensate, we store the string, and transform to/from URL href at the edges
  let PAGES_TO_VISIT = new Set([rootURL.href]);

  log.info('Will run with:', {...opts});

  let run = 0;

  const browser = await puppeteer.launch({
    args: opts.puppeteerChromeLaunchArgs,
  });

  try {
    // TODO: Consider Depth-First Search vs. Breadth-First Search
    for (const pageHref of PAGES_TO_VISIT) {
      // First, convert to a URL (if we have gotten this from the scripts below, this is OK)
      let pageUrl = new URL(pageHref);

      // Double check that the page has not been visited (might come into play for concurrency)
      const {shouldProcess: shouldRun, reason} = shouldProcess(
        ROUTE_MANIFEST,
        ROUTES_VISITED,
        PAGES_VISITED,
        opts.pageLimit,
        run,
        pageUrl
      );

      log.info(
        `Page: ${pageUrl.href}. Should process: ${shouldRun}, reason: ${reason.type}`
      );

      // Remove from queue if it will not run
      if (!shouldRun) {
        PAGES_TO_VISIT.delete(pageUrl.href);
      }

      if (shouldRun) {
        run++;
        log.trace('Run', run);

        log.info('Will process', pageUrl.href);

        // Also add "in progress" to the result log
        streaming.sendInProgress(pageUrl.href, opts.streaming);

        // TODO: streamingSendReportError(streaming, {href: pageUrl.href, error: err});

        // Add to pages visited, remove from queue
        PAGES_VISITED.add(pageUrl.href);
        PAGES_TO_VISIT.delete(pageUrl.href);

        // If the reason we selected a page was because of a route, then add that route to the visited set
        if (reason.type === 'Route') {
          ROUTES_VISITED.add(reason.route);
        }

        // Process the page, get results
        const attemptRun = async () => {
          log.trace('Inside attemptRun');
          let succeeded = false;
          for (let tryCount = 1; tryCount <= opts.maxRetries!; tryCount++) {
            if (!succeeded) {
              log.trace(`Attempt ${tryCount} of ${opts.maxRetries}`);
              try {
                log.trace('Inside try');
                const processResults = await processPage(browser, pageUrl);
                succeeded = true;
                return processResults;
              } catch (err) {
                log.error('There was an error processing the page', err);
              }
            }
          }

          if (!succeeded) {
            // TODO: streamingSendErrorProcessing(pageUrl.href, error)
            return {results: [], nextPages: []};
          }
        };

        log.info('Will attempt run');
        const runAttempt = await attemptRun();
        let results = runAttempt!.results as AxeResults;
        let nextPages = runAttempt!.nextPages;

        // Append the results to the list
        // Yield the current results to the consumer, tagged so they can separate them
        yield {type: 'results', data: results};

        // Send a 'GotResults' message on the streaming channel
        streaming.sendGotResults(results, opts.streaming);

        // Remove any visited pages, and add the rest to the ones to visit
        const pagesToVisit = getPagesToVisit(nextPages, PAGES_VISITED, opts);

        // NOTE: We trasnform from a URL to href for storage, see the reasons in Set above
        pagesToVisit.forEach(page => PAGES_TO_VISIT.add(page.href));
      }
    }

    // Write serialized state
    const stateObj = {
      entry: rootURL.href,
      options: opts,
      run: run,
      routes: ROUTE_MANIFEST,
      pagesVisited: Array.from(PAGES_VISITED.keys()),
      routesVisited: Array.from(ROUTES_VISITED.keys()),
      toVisit: Array.from(PAGES_TO_VISIT.keys()),
    };

    yield {type: 'state', data: stateObj};
  } finally {
    // We must ensure that we close the browser, when the iteration stops.
    // This can happen either after exhausting the generator, or breaking or returning.
    // finally is the only way to do this
    // @see https://jakearchibald.com/2017/async-iterators-and-generators/
    log.info('Cleaning up');
    await browser.close();
  }
}

async function processPage(browser: Browser, pageUrl: URL) {
  log.trace('Inside processPage');
  const page = await browser.newPage();
  await page.setBypassCSP(true);

  // Use 'networkidle2' to allow time for http-equiv redirects etc.
  const response = await page.goto(pageUrl.href, {waitUntil: 'networkidle2'});
  log.info(pageUrl.href);

  // Analyse page, get results
  const results = await analysePage(page);

  // Gather next links
  const nextPages = await gatherNextPages(pageUrl, page);

  await page.close();
  return {results, nextPages};
}

async function analysePage(pageObj: Page) {
  return await new AxePuppeteer(pageObj).analyze();
}

async function gatherNextPages(currentPageUrl: URL, pageObj: Page) {
  // Gather all links on a page
  const htmlContent = await pageObj.content();
  const $ = cheerio.load(htmlContent);
  const links = $(`a`);
  const linkUrls = links.map((i, link) => link.attribs['href']).get();

  // Convert a URL to an absolute url, if it is relative, then filter by origin
  /*
   * @example new URL('/en/page', 'https://example.com').href === 'https://example.com/en/page
   * @example new URL('/en/page', 'https://example.com/otherpage').href === 'https://example.com/en/page
   * @example new URL('https://otherexample.com/en/page', 'https://example.com').href !== 'https://example.com/en/page
   */
  const relevantUrls = linkUrls
    .map(url => new URL(url, currentPageUrl))
    .filter(url => url.origin === currentPageUrl.origin);

  return relevantUrls;
}

function getPagesToVisit(
  urls: Array<URL>,
  visited: Set<string>,
  options: Options
) {
  // TODO: We could some fancy things here, such as:
  //  - having a maximumDepth counter
  //  - some other metric / heuristic?

  return urls
    .filter(url => !visited.has(url.href))
    .filter(url => {
      if (options.ignoreExtensions) {
        const ext = path.extname(url.pathname);
        // Reject if extension is in ignore list
        return !options.ignoreExtensions.includes(ext);
      }
      // Pass through otherwise
      return true;
    })
    .filter(url => {
      if (options.ignoreFragmentLinks) {
        // Reject if there is a fragment
        return !url.hash;
      }
      // Pass through otherwise
      return true;
    });
}

//
// PROCESSING

type ProcessDecision = {
  shouldProcess: boolean;
  reason: ProcessReason;
};

type ProcessReason =
  | {type: 'PageLimit'}
  | {type: 'Verbatim'; href: string}
  | {type: 'Route'; route: string};

const ReasonPageLimit = (): ProcessReason => ({type: 'PageLimit'});

const ReasonVerbatim = (href: string): ProcessReason => ({
  type: 'Verbatim',
  href,
});

const ReasonRoute = (route: string): ProcessReason => ({type: 'Route', route});

/** Decide whether a pageHref should be visited */
function shouldProcess(
  ROUTE_MANIFEST: Array<string>,
  ROUTES_VISITED: Set<string>,
  PAGES_VISITED: Set<string>,
  PAGE_LIMIT: number,
  run: number,
  pageUrl: URL
): ProcessDecision {
  // TODO: Also add things to the relevant _VISITED page!
  if (run >= PAGE_LIMIT) {
    log.debug('Page limit reached');
    return {shouldProcess: false, reason: ReasonPageLimit()};
  } else {
    // If the route manifest is specified, consider the route
    if (ROUTE_MANIFEST) {
      const routes = ROUTE_MANIFEST.map(matchit.parse);
      const matchesRoute = (str: string) => matchit.match(str, routes);
      const routeMatch = matchesRoute(pageUrl.pathname);

      if (routeMatch.length) {
        // If the page matches one of the routes specified, then check if visited
        const {old: matchedRoute} = routeMatch[0];
        log.debug('Route matches, will check if visited');
        return {
          shouldProcess: !ROUTES_VISITED.has(matchedRoute),
          reason: ReasonRoute(matchedRoute),
        };
      } else {
        // If no match, then consider the verbatim version
        log.debug('No route matches, will check verbatim');
        return {
          shouldProcess: !PAGES_VISITED.has(pageUrl.href),
          reason: ReasonVerbatim(pageUrl.href),
        };
      }
    } else {
      // If no manifest, then consider the verbatim version
      log.debug('No manifest, will check verbatim');
      return {
        shouldProcess: !PAGES_VISITED.has(pageUrl.href),
        reason: ReasonVerbatim(pageUrl.href),
      };
    }
  }
}

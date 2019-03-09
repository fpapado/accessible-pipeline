import {AxePuppeteer} from 'axe-puppeteer';
import puppeteer, {Browser, Page} from 'puppeteer';
import {AxeResults} from 'axe-core';
import cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';
import {promisify} from 'util';
import {logger} from './logger';
import matchit from 'matchit';

// Create a child logger scoped to the module
const log = logger.child({module: 'root'});

// Create a logger for results
const resultLog = logger.child({module: 'results'});

// Promise-friendly core fns
const writeFile = promisify(fs.writeFile);
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
type Options = {
  // TODO: entry: string | Array<string>
  pageLimit: number;
  maxRetries?: number;
  ignoreFragmentLinks?: boolean;
  ignoreExtensions?: Array<string>;
  routeManifestPath?: string;
};

const DEFAULT_OPTIONS: Partial<Options> = {maxRetries: 2};

const TEST_OPTIONS: Options = {
  pageLimit: 20,
  maxRetries: 5,

  // TODO: Shoold ignoreExtensions allow not having the '.'?
  ignoreExtensions: ['.pdf', '.zip'],
  // TODO: Should we have a way to say "include at least one fragment link"?
  //  I cannot easily imagine a page having only 'example.com#thing' links to it, but it could happen...
  //  or do we just advise folks to add it to roots?

  // TODO: Consider the naming fragment vs hash
  //  in particular, this is about 'example.com/faq#question and *not* about example.com/#/route
  //  the former is common for linking to headings, the latter is common for some client-side routing
  //  We should specify that we mean the former!
  // TODO: Actually make it work like that. '#/route' gets picked up atm...
  ignoreFragmentLinks: true,
  routeManifestPath: 'routes.json',
};

async function main(streaming: boolean, rootURL: URL, opts: Options) {
  const options = {...DEFAULT_OPTIONS, ...opts};

  // Load RouteManifest, if specified
  // TODO: Consider a union for this
  let ROUTE_MANIFEST;
  if (options.routeManifestPath) {
    // Read the manifest specified
    try {
      ROUTE_MANIFEST = await readFile(options.routeManifestPath, 'utf8').then(
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

  const PAGES_VISITED = new Set<string>();
  const ROUTES_VISITED = new Set<string>();

  // It is preferable to store a string in the set, otherwise identities get jumbled with objects...
  // Wish there was a good hashed set implementation
  // To compensate, we store the string, and transform to/from URL href at the edges
  let PAGES_TO_VISIT = new Set([rootURL.href]);
  let RESULTS: Array<AxeResults> = [];

  log.info('Will run with:', {...options});

  const browser = await puppeteer.launch();
  let run = 0;

  // TODO: Consider Depth-First Search vs. Breadth-First Search
  for (const pageHref of PAGES_TO_VISIT) {
    // First, convert to a URL (if we have gotten this from the scripts below, this is OK)
    const pageUrl = new URL(pageHref);

    // Double check that the page has not been visited (might come into play for concurrency)
    const {shouldProcess: shouldRun, reason} = shouldProcess(
      ROUTE_MANIFEST,
      ROUTES_VISITED,
      PAGES_VISITED,
      options.pageLimit,
      run,
      pageUrl
    );

    log.info(`Should process: ${shouldRun}, reason: ${reason.type}`);

    if (shouldRun) {
      run++;
      log.trace('Run', run);

      log.info('Will check', pageUrl.href);

      // Also add "in progress" to the result log
      streamingSendInProgress(streaming, pageUrl.href);

      // Add to pages visited, remove from queue
      PAGES_VISITED.add(pageUrl.href);
      PAGES_TO_VISIT.delete(pageUrl.href);

      // If the reason we selected a page was because of a route, then add that route to the visited set
      if (reason.type === 'Route') {
        ROUTES_VISITED.add(reason.route);
      }

      // Process the page, get results
      log.info('Will process page');

      const attemptRun = async () => {
        let succeeded = false;
        for (let tryCount = 1; tryCount <= options.maxRetries!; tryCount++) {
          if (!succeeded) {
            log.trace(`Attempt ${tryCount} of ${options.maxRetries}`);
            try {
              const processResults = await processPage(browser, pageUrl);
              succeeded = true;
              return processResults;
            } catch (err) {
              log.error('There was an error processing the page', err);
            }
          }
        }

        if (!succeeded) {
          return Promise.resolve({results: [], nextPages: []});
        }
      };

      const runAttempt = await attemptRun();
      let results = runAttempt!.results as AxeResults;
      let nextPages = runAttempt!.nextPages;

      // Append the results to the list
      // TODO: Could instead opt to return the results as a stream, and decide where to write in the consumer
      RESULTS = RESULTS.concat(results);

      // Send a 'GotResults' message on the streaming channel
      streamingSendGotResults(streaming, results);

      // Remove any visited pages, and add the rest to the ones to visit
      const pagesToVisit = getPagesToVisit(nextPages, PAGES_VISITED, options);

      // NOTE: We trasnform from a URL to href for storage, see the reasons in Set above
      pagesToVisit.forEach(page => PAGES_TO_VISIT.add(page.href));

      // TODO: Format the results here somehow?
      // TODO: Output to TAP, so that we can transform/format with more standard tools
      // Alternative, after everything is gathered, run a reportResults(results)
      // log.log('Results', RESULTS);
      // log.log('Next pages', pagesToVisit);
    }
  }

  // Close the browser and write reports and state
  await browser.close();

  // Some sort of id for the run
  const runId = Date.now();
  const reportFileName = `report-${runId}.json`;
  const stateFileName = `state-${runId}.json`;

  await writeFile(reportFileName, JSON.stringify(RESULTS, null, 2), 'utf8');
  log.info(`Wrote ${reportFileName}`);

  const stateObj = {
    entry: rootURL.href,
    options: options,
    run: run,
    routes: ROUTE_MANIFEST,
    pagesVisited: Array.from(PAGES_VISITED.keys()),
    routesVisited: Array.from(ROUTES_VISITED.keys()),
    toVisit: Array.from(PAGES_TO_VISIT.keys()),
  };

  await writeFile(stateFileName, JSON.stringify(stateObj, null, 2), 'utf8');
  log.info(`Wrote ${stateFileName}`);
}

async function processPage(browser: Browser, pageUrl: URL) {
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

//
// STREAMING

function streamingSendInProgress(streaming: boolean, href: string) {
  if (streaming) {
    resultLog.info({msg: 'InProgress', href});
  }
}

function streamingSendGotResults(streaming: boolean, results: AxeResults) {
  // Write to the results stream, after rewriting results to only keep the node targets
  // Helps avoid some odd edge cases where the JSON breaks parsing when piping, because of the HTML content
  // TODO: Declare StreamingAxeResults type, which matches the shape we actually send.
  if (streaming) {
    resultLog.info({
      msg: 'GotResults',
      results: {
        ...results,
        violations: results.violations.map(violation => ({
          ...violation,
          nodes: violation.nodes.map(node => ({
            // Only keep the target, since that's what we report on
            target: node.target,
          })),
        })),
        passes: results.passes.map(pass => ({
          ...pass,
          nodes: pass.nodes.map(node => ({
            // Only keep the target, since that's what we report on
            target: node.target,
          })),
        })),
        incomplete: results.incomplete.map(violation => ({
          ...violation,
          nodes: violation.nodes.map(node => ({
            // Only keep the target, since that's what we report on
            target: node.target,
          })),
        })),
        inapplicable: results.inapplicable.map(violation => ({
          ...violation,
          nodes: violation.nodes.map(node => ({
            // Only keep the target, since that's what we report on
            target: node.target,
          })),
        })),
      },
    });
  }
}

//
// CLI

// TODO: Accept options from a proper CLI soon (tm)
function cli() {
  // Whether to output a results stream under resultsLog
  const streaming = false;

  // Read the url as the first CLI argument
  // TODO: Accept multiple roots in the future
  const rootHref = process.argv[2];

  let rootURL: URL;
  try {
    rootURL = new URL(rootHref);
  } catch (err) {
    log.error(
      'The URL you provided was in an unexpected format: ',
      err.toString()
    );
    process.exit(1);
  }

  main(streaming, rootURL!, TEST_OPTIONS).catch(err => {
    // TODO: Consider other ways of reporting errors here
    log.error('The process encountered an unrecoverable error: ', err);
    process.exit(1);
  });
}

cli();

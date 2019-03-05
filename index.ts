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

// Promise-friendly core fns
const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);

// TODO: Source-map-support

// TODO: more granular error boundaries, and error reporting
// for example {..., fetcherErrors: [{url: ..., reason: ...}]}
// - "Friends don't let friends not handle errors"

// TODO: Consider batching / parallelism options
// TODO: Use batching for resilience
// TODO: Consider AxE reporting verbosity toggle
// TODO: (Big one) Router path exclusions
// @example https://fiba3x3.com/docs/*
// TODO: Ability to set a UA to hide from analytics

// Common options for excluding links to visit
// For example *.pdf and #heading-link came up often in early iterations
type Options = {
  // TODO: entry: string | Array<string>
  ignoreFragmentLinks?: boolean;
  ignoreExtensions?: Array<string>;
  routeManifestPath?: string;
};

const DEFAULT_OPTIONS: Partial<Options> = {};

const TEST_OPTIONS: Options = {
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

const ENTRY = 'https://fiba3x3.com/';

async function main(opts?: Options) {
  const options = {...DEFAULT_OPTIONS, ...opts};

  // Load RouteManifest, if specified
  // TODO: Consider a union for this
  const MANIFEST_SPECIFIED = !!options.routeManifestPath;
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
    // TODO: Validate the format
  }

  const PAGES_VISITED = new Set<string>();
  const ROUTES_VISITED = new Set<string>();

  // It is preferable to store a string in the set, otherwise identities get jumbled with objects...
  // Wish there was a good hashed set implementation
  // To compensate, we store the string, and transform to/from URL href at the edges
  let PAGES_TO_VISIT = new Set([ENTRY]);
  let RESULTS: Array<AxeResults> = [];
  const PAGE_LIMIT = 5;

  log.info('Will run with:', {...options, PAGE_LIMIT});

  const browser = await puppeteer.launch();
  let run = 0;

  // TODO: Maybe we need a while here
  // TODO: Consider Depth-First Search vs. Breadth-First Search
  for (const pageHref of PAGES_TO_VISIT) {
    // Double check that the page has not been visited (might come into play for concurrency)
    const shouldRun = shouldProcess(
      ROUTE_MANIFEST,
      ROUTES_VISITED,
      PAGES_VISITED,
      PAGE_LIMIT,
      run,
      pageHref
    );

    log.info(`Should process: ${shouldRun}`);

    if (shouldRun) {
      run++;
      log.trace('Run', run);

      // First, convert to a URL (if we have gotten this from the scripts below, this is OK)
      const pageUrl = new URL(pageHref);

      log.info('Will check', pageUrl.href);

      // Add to pages visited, remove from queue
      // TODO: Add to ROUTES_VISITED as well if shouldRun.reason === 'Route' && shouldRun.reason.data
      PAGES_VISITED.add(pageUrl.href);
      PAGES_TO_VISIT.delete(pageUrl.href);

      // Process the page, get results
      const {results, nextPages} = await processPage(browser, pageUrl);
      log.info('Got results');

      // Append the results to the list
      // RESULTS = RESULTS.concat(results);

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

  // Close the browser and write reports
  await browser.close();

  await writeFile('report.json', JSON.stringify(RESULTS, null, 2), 'utf8');
  log.info('Wrote report.json');

  await writeFile(
    'queue.json',
    JSON.stringify(Array.from(PAGES_TO_VISIT.values()), null, 2),
    'utf8'
  );
  log.info('Wrote queue.json for remaining urls');
}

async function processPage(browser: Browser, pageUrl: URL) {
  const page = await browser.newPage();
  await page.setBypassCSP(true);

  // Use 'networkidle2' to allow time for http-equiv redirects etc.
  const response = await page.goto(pageUrl.href, {waitUntil: 'networkidle2'});
  log.info(pageUrl.href);

  // Analyse page, get results
  const results: any[] = [];
  // const results = await analysePage(page);

  // Gather next links
  // TODO: Consider not de-duplicating here, and returning all to the parent to decide
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
  //  - checking a route matching
  //  - having a maximumDepth counter
  //  - some other metric / heuristic?

  // For now, follow verbatim
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

/** Decide whether a pageHref should be visited */
function shouldProcess(
  ROUTE_MANIFEST: Array<string>,
  ROUTES_VISITED: Set<string>,
  PAGES_VISITED: Set<string>,
  PAGE_LIMIT: number,
  run: number,
  pageHref: string
) {
  // TODO: Also add things to the relevant _VISITED page!
  if (run > PAGE_LIMIT) {
    log.debug('Page limit reached');
    return false;
  } else {
    // If the route manifest is specified, consider the route
    if (ROUTE_MANIFEST) {
      const routes = ROUTE_MANIFEST.map(matchit.parse);
      const matchesRoute = (str: string) => matchit.match(str, routes);
      const routeMatch = matchesRoute(pageHref);

      if (routeMatch.length) {
        // If the page matches one of the routes specified, then check if visited
        const {old: matchedRoute} = routeMatch[0];
        log.debug('Route matches, will check if visited');
        return !ROUTES_VISITED.has(matchedRoute);
      } else {
        // If no match, then consider the verbatim version
        log.debug('No route matches, will check verbatim');
        return !PAGES_VISITED.has(pageHref);
      }
    } else {
      // If no manifest, then consider the verbatim version
      log.debug('No manifest, will check verbatim');
      return !PAGES_VISITED.has(pageHref);
    }
  }
}

main(TEST_OPTIONS).catch(err => {
  // TODO: Consider other ways of reporting errors here
  log.error('The process encountered an unrecoverable error: ', err);
  process.exit(1);
});

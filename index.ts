import {AxePuppeteer} from 'axe-puppeteer';
import puppeteer, {Browser, Page} from 'puppeteer';
import {AxeResults} from 'axe-core';
import cheerio from 'cheerio';
import fs from 'fs';
import {promisify} from 'util';
const writeFile = promisify(fs.writeFile);

// Common options for excluding links to visit
// For example *.pdf and #heading-link came up often in early iterations
type Options = {
  ignoreFragmentLinks?: boolean;
  ignoreExtensions?: Array<string>;
};

const ENTRY = 'https://fiba3x3.com/';

async function main() {
  const PAGES_VISITED = new Set<string>();
  // It is preferable to store a string in the set, otherwise identities get jumbled with objects...
  // Wish there was a good hashed set implementation
  // To compensate, we store the string, and transform to/from URL href at the edges
  let PAGES_TO_VISIT = new Set([ENTRY]);
  let RESULTS: Array<AxeResults> = [];
  const PAGE_LIMIT = 20;

  const browser = await puppeteer.launch();
  let run = 0;

  // TODO: Maybe we need a while here
  // TODO: Consider Depth-First Search vs. Breadth-First Search
  for (const pageHref of PAGES_TO_VISIT) {
    // Double check that the page has not been visited (might come into play for concurrency)
    if (run < PAGE_LIMIT && !PAGES_VISITED.has(pageHref)) {
      run++;
      console.log('Run', run);

      // First, convert to a URL (if we have gotten this from the scripts below, this is OK)
      const pageUrl = new URL(pageHref);

      console.log('Will check', pageUrl.href);
      // Add to pages visited
      PAGES_VISITED.add(pageUrl.href);

      // Process the page, get results
      const {results, nextPages} = await processPage(browser, pageUrl);
      console.log('Got results');

      // Append the results to the list
      // RESULTS = RESULTS.concat(results);

      // Remove any visited pages, and add the rest to the ones to visit
      const pagesToVisit = getPagesToVisit(PAGES_VISITED, nextPages);

      // NOTE: We trasnform from a URL to href for storage, see the reasons in Set above
      pagesToVisit.forEach(page => PAGES_TO_VISIT.add(page.href));

      // TODO: Format the results here somehow?
      // Alternative, after everything is gathered, run a reportResults(results)
      // console.log('Results', RESULTS);
      // console.log('Next pages', pagesToVisit);
    }
  }

  // Close the browser and write reports
  await browser.close();

  await writeFile('report.json', JSON.stringify(RESULTS, null, 2), 'utf8');
  console.log('Wrote report.json');

  await writeFile(
    'queue.json',
    JSON.stringify(Array.from(PAGES_TO_VISIT.values()), null, 2),
    'utf8'
  );
  console.log('Wrote queue.json for remaining urls');
}

async function processPage(browser: Browser, pageUrl: URL) {
  const page = await browser.newPage();
  await page.setBypassCSP(true);

  await page.goto(pageUrl.href);

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

function getPagesToVisit(visited: Set<string>, urls: Array<URL>) {
  // TODO: We could some fancy things here, such as:
  //  - checking a route matching
  //  - having a maximumDepth counter
  //  - some other metric / heuristic?

  // For now, follow verbatim
  return urls.filter(url => !visited.has(url.href));
}

main();

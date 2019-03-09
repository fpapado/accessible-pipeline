#!/usr/bin/env node
import sade from 'sade';
import * as run from './index';

const prog = sade('accessible-pipeline');

prog.version('0.1.0');

prog
  .command('run <url>')
  .describe(
    'Run the crawler starting from a given URL, reporting issues along the way.'
  )
  .example('run https://example.com')
  .option(
    '--pageLimit',
    'The maximum number of pages to crawl. Used to prevent long runs.',
    20
  )
  .option(
    '--maxRetries',
    'The maximum number of attempts to process a page after errors, before moving to the next one.',
    5
  )
  .option(
    '--routeManifestPath',
    'The path to a route manifest file. The route manifest allows de-duplicating visited routes.'
  )
  .option(
    '--ignoreFragmentLinks',
    'Whether to ignore visiting fragment (#) links. Useful for avoiding in-page links.'
  )
  .option(
    '--ignoreExtensions',
    'A comma-separated list of extensions to ignore. Useful for avoiding certain non-html links.'
  )
  .action((url: string, opts: run.CLIOptions) => {
    console.log(url, opts);
    run.cliEntry(url, opts);
  });

prog
  .command('view <pathToReport>')
  .describe(
    'View a report output by accessible-pipeline run. Expects the path to a report file.'
  )
  .example('view report-1234.json')
  .action((pathToReport: string, opts: unknown) => {
    console.log(pathToReport, opts);
  });

prog.parse(process.argv);

const description = `
  accessible-pipeline
    run [entry URL]
      --pageLimit
      --maxRetries
      --routeManifestPath
      --ignoreFragmentLinks
      --ignoreExtensions
      --ci (prints computer-centric output, without the reporter; exits (1) on any failure)
      --pretty (prettifies the output; different from the reporter)

      By default, it shows the report by setting (streamable=true) and piping in to the reporter.
      Saves the report to a file.
      TODO: Print "20% to 40%"
      TODO: Print "saved report to file ..., you can view it again with accessible-pipeline view report-XZY.json"

    view [report path]
      View a report output by accessible-pipeline run
`;

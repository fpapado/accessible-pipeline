#!/usr/bin/env node
import {spawn} from 'child_process';
import sade from 'sade';
import * as run from './index';
import * as report from './reporter';

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
  .option('--ci', 'Exits 1 on error, outputs only operational logs.')
  .option(
    '--streaming',
    'Output specific information on stdout under the "results" module. Use together with `accessible-pipeline view --streaming`, to display a live reporter.'
  )
  .action((url: string, opts: run.CLIOptions) => {
    // If CI is specified, ditch the reporter and output the regular JSON
    if (opts.ci) {
      let ignoreExtensions;
      if (opts.ignoreExtensions) {
        // TODO: Do some more validation here
        // TODO: Define CLIOptions above, and then below
        ignoreExtensions = ((opts.ignoreExtensions as any) as string)
          .split(',')
          .map(str => str.trim());
      }
      run.cliEntry(url, {...opts, ignoreExtensions});
    } else {
      console.log(process.argv.slice(3));
      const run = spawn('ts-node', [
        ...process.argv.slice(1),
        '--ci',
        '--streaming',
      ]);
      const view = spawn('ts-node', ['cli.ts', 'view', '--streaming']);

      run.stdout.pipe(view.stdin);
      view.stdout.pipe(process.stdout);
    }
  });

prog
  .command('view')
  .describe(
    'View a report output by `accessible-pipeline run`. Expects the path to a report file, or a stream in stdin.'
  )
  .example('view --file report-1234.json')
  .option('-f, --file', 'The path to a report file.')
  .option(
    '--streaming',
    'Listen to stdin. Use together with `accessible-pipeline run --streaming`, to display a live reporter.'
  )
  .action((opts: report.CLIOptions) => {
    if (!opts.file && !opts.streaming) {
      console.log(
        '  ERROR\n    One of either --file or --streaming must be specified.\n\n  Run `$ accessible-pipeline view --help` for more info.'
      );
    }
    report.cliEntry({streaming: opts.streaming, file: opts.file});
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
      --streamable

      By default, it shows the report by setting (streamable=true) and piping in to the reporter.
      Saves the report to a file.
      TODO: Print "20% to 40%"
      TODO: Print "saved report to file ..., you can view it again with accessible-pipeline view report-XZY.json"

    view [report path]
      View a report output by accessible-pipeline run
`;

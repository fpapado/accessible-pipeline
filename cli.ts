#!/usr/bin/env node
import {spawn} from 'child_process';
import sade from 'sade';
import * as run from './index';
import * as report from './reporter';

const prog = sade('accessible-pipeline');

prog.version('0.1.0');

// TODO: Print "20% to 40% ... from axe-cli"
// TODO: Print "saved report to file ..., you can view it again with accessible-pipeline view report-XZY.json"

prog
  .command('run <url>')
  .describe(
    'Run the crawler starting from a given URL, reporting issues along the way. Saves the report to a file.'
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
  .option(
    '--ci',
    'Output computer-centric operational logs. Exit (1) on error.'
  )
  .option(
    '--streaming',
    'Output specific information on stdout under the "results" module. Use together with `accessible-pipeline view --streaming`, to display a live reporter.'
  )
  .action((url: string, opts: run.CLIOptions) => {
    // Disallow DEBUG_LOG_PRETTY and --streaming. It is most likely an accident.
    if (process.env.DEBUG_LOG_PRETTY === 'true' && opts.streaming) {
      console.log(
        '  ERROR\n    You cannot set DEBUG_LOG_PRETTY and --streaming, because --streaming relies on the JSON output.\n    If you want to debug only the process output consider setting --ci and not --streaming.'
      );
      process.exit(1);
    }

    // If ci or streaming is specified, only output pino's NDJSON
    // --streaming is a superset of --ci, because it outputs the JSON *and* the extra 'results' log
    if (opts.ci || opts.streaming) {
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
      // Similar to the check above
      if (process.env.DEBUG_LOG_PRETTY === 'true') {
        console.log(
          '  ERROR\n    You cannot set DEBUG_LOG_PRETTY and show the reporter, because it relies on the JSON output.\n    If you want to debug only the process output consider setting --ci and not --streaming.'
        );
        process.exit(1);
      }

      // If not in CI, set up two processes: a runner and a reporter
      // The runner is the `run` command with --ci and --streaming, and other options forwarded
      // The reporter is the `view` command with --streaming
      // Pipe the output of the first into the second, and forward that to
      // the terminal
      const run = spawn('./bin/cli.js', [
        // Forward the existing arguments
        'run',
        ...process.argv.slice(3),
        // Append --ci and --streaming
        '--ci',
        '--streaming',
      ]);
      // NOTE: We also append --color, to force chalk to show colours
      // TODO: If this becomes an issue, we can instead forward a --no-color option from above
      const view = spawn('./bin/cli.js', ['view', '--streaming', '--color']);

      // Pipe one process into another, and then out into our terminal
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

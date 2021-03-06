import fs from 'fs';
import {promisify} from 'util';
import * as core from './core';
import * as streaming from './streaming';
import {logger} from './logger';

// Promise-friendly core fns
const writeFile = promisify(fs.writeFile);

// Create a child logger scoped to the module
const log = logger.child({module: 'run'});

/** Code backing the "run" CLI command */
async function main(rootURL: URL, opts: core.Options) {
  // Run the core functionality
  const {results, state} = await core.runCore(rootURL, opts);

  // Write reports and state

  // Generate some sort of id for the run
  const runId = Date.now();
  const reportFileName = `report-${runId}.json`;
  const stateFileName = `state-${runId}.json`;

  // Write report
  await writeFile(reportFileName, JSON.stringify(results, null, 2), 'utf8');
  log.info(`Wrote ${reportFileName}`);
  streaming.sendWroteReportFile(reportFileName, opts.streaming);

  await writeFile(stateFileName, JSON.stringify(state, null, 2), 'utf8');
  log.info(`Wrote ${stateFileName}`);
  streaming.sendWroteStateFile(stateFileName, opts.streaming);
}

//
// CLI

export type CLIOptions = core.Options & {
  streaming: boolean;
  ci: boolean;
};

// TODO: Accept multiple roots in the future
export function cliEntry(rootHref: string, opts: CLIOptions) {
  // Whether to output a results stream under resultsLog
  const {ci, ...options} = opts;

  // Read the url as the first CLI argument
  let rootURL: URL;

  try {
    rootURL = new URL(rootHref);
  } catch (err) {
    log.fatal(
      'The URL you provided was in an unexpected format: ',
      err.toString()
    );
    process.exit(1);
  }

  main(rootURL!, options).catch(err => {
    // TODO: Consider other ways of reporting errors here
    log.fatal('The process encountered an unrecoverable error: ', err);
    process.exit(1);
  });
}

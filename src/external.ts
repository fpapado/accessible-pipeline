import fs from 'fs';
import {promisify} from 'util';
import * as core from './core';
import * as streaming from './streaming';
import {logger} from './logger';

const writeFile = promisify(fs.writeFile);

const log = logger.child({module: 'external'});

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

const rootURL = new URL('https://worldtour.fiba3x3.com/2018');
const opts = {
  pageLimit: 5,
};

export function cliEntry() {
  main(rootURL, opts)
    .then(x => {
      console.log('Done');
    })
    .catch(err => {
      log.fatal('Deaded');
    });
}

cliEntry();

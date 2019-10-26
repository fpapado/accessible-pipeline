const {runCore} = require('..');
const fs = require('fs');
const {promisify} = require('util');

const writeFile = promisify(fs.writeFile);

async function main() {
  const rootURL = new URL('https://example.com');
  const opts = {
    pageLimit: 5,
  };

  // Get the results and the state from running the core functions
  const {results, state} = await runCore(rootURL, opts);

  await writeFile('report.json', JSON.stringify(results, null, 2), 'utf8');
  // Write reports and state

  // Generate some sort of id for the run
  const runId = Date.now();
  const reportFileName = `report-${runId}.json`;
  const stateFileName = `state-${runId}.json`;

  // Write report
  await writeFile(reportFileName, JSON.stringify(results, null, 2), 'utf8');
  console.log(`Wrote ${reportFileName}`);

  await writeFile(stateFileName, JSON.stringify(state, null, 2), 'utf8');
  console.log(`Wrote ${stateFileName}`);
}

main().then(x => console.log('Done'));

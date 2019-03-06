import React from 'react';
import {render, Box} from 'ink';
import fs from 'fs';
import {promisify} from 'util';
import {AxeResults} from 'axe-core';
const readFile = promisify(fs.readFile);

// Reporter Component

type ReporterProps = {reportData: AxeResults[]};

const Reporter: React.FunctionComponent<ReporterProps> = (props) => {
  return <Box>Hello!</Box>;
}

// Main

async function main(reportFilename: string) {
  // Read the data
  const reportData = await readFile(reportFilename, 'utf8').then(data =>
    JSON.parse(data)
  );

  render(<Reporter reportData={reportData} />);
}

main('report.json');

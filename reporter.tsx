import React from 'react';
import {render, Box, Text, Color} from 'ink';
import fs from 'fs';
import {promisify} from 'util';
import {AxeResults} from 'axe-core';
const readFile = promisify(fs.readFile);

// Reporter Component

type ReporterProps = {reportData: AxeResults[]};

const Reporter: React.FunctionComponent<ReporterProps> = props => {
  const {reportData} = props;

  return (
    <Box flexDirection="column">
      {reportData.map(result => (
        <Box key={result.url} flexDirection="column" marginBottom={1}>
          <Box>
            <Text bold>{result.url}</Text>
          </Box>
          <Box flexDirection="column">
            <Box>
              <Color red>
                <Text>Violations: </Text>
                <Text>{result.violations.length}</Text>
              </Color>
            </Box>
            <Box marginLeft={1} flexDirection="column">
              {result.violations.map(violation => (
                <Box key={violation.id}>
                  - <Text>{violation.help}</Text>
                </Box>
              ))}
            </Box>
          </Box>
          <Box>
            <Color green>
              <Text>Passes: </Text>
              <Text>{result.passes.length}</Text>
            </Color>
          </Box>
          <Box>
            <Color blue>
              <Text>Incomplete: </Text>
              <Text>{result.incomplete.length}</Text>
            </Color>
          </Box>
        </Box>
      ))}
    </Box>
  );
};

// Main

async function main(reportFilename: string) {
  // Read the data
  const reportData = await readFile(reportFilename, 'utf8').then(data =>
    JSON.parse(data)
  );

  render(<Reporter reportData={reportData} />);
}

main('report-1551902940917.json');

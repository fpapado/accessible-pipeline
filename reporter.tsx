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
  const pagesPassed = reportData.filter(res => res.violations.length == 0)
    .length;

  return (
    <Box flexDirection="column">
      {reportData.map(result => (
        <Box key={result.url} flexDirection="column" marginBottom={2}>
          <ResultRow result={result} />
        </Box>
      ))}
      <Box>
        <Text>Pages:</Text>{' '}
        <Text>
          <Color green>{pagesPassed} had no violations</Color>, {pagesPassed} of{' '}
          {reportData.length} total
        </Text>
      </Box>
    </Box>
  );
};

type ResultRowProps = {
  result: AxeResults;
};

const ResultRow: React.FunctionComponent<ResultRowProps> = ({result}) => {
  const hasViolations = result.violations.length !== 0;

  return (
    <>
      <Box>
        <Box marginRight={1}>
          {hasViolations ? (
            <Color bgRed black>
              FAIL
            </Color>
          ) : (
            <Color bgGreen black>
              PASS
            </Color>
          )}
        </Box>
        <Text bold>{result.url}</Text>
      </Box>
      <Box flexDirection="column">
        {hasViolations ? (
          <Box>
            <Color red>
              <Text>Violations: </Text>
              <Text>{result.violations.length}</Text>
            </Color>
          </Box>
        ) : null}
        <Box marginLeft={1} flexDirection="column">
          {result.violations.map(violation => (
            <Box key={violation.id} marginBottom={1}>
              -{' '}
              <Box flexDirection="column">
                <Box>
                  <Text>{violation.description}</Text>
                </Box>
                <Box>
                  <Text>{violation.help}</Text>
                </Box>
                <Box>
                  Learn more: <Color underline>{violation.helpUrl}</Color>
                </Box>
                <Box>
                  Nodes:{' '}
                  <Box flexDirection="column">
                    {violation.nodes.map(node => (
                      <Box key={node.target.join('')}>
                        {node.target.map(target => (
                          <Color dim>
                            <Box key={target}>{target}</Box>
                          </Color>
                        ))}
                      </Box>
                    ))}
                  </Box>
                </Box>
              </Box>
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
    </>
  );
};

// Main

async function main(reportFilename: string) {
  // Read the data
  const reportData = await readFile(reportFilename, 'utf8').then(data =>
    JSON.parse(data)
  );

  // TODO: Options, e.g. "showNodes"
  render(<Reporter reportData={reportData} />);
}

main(process.argv[2]);

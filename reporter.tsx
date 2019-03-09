import React, {useContext, useEffect, useMemo, useReducer} from 'react';
import {render, Box, Text, Color, StdinContext, Static} from 'ink';
import fs from 'fs';
import {promisify} from 'util';
import split from 'split2';
import jsonParse from 'fast-json-parse';
import {AxeResults} from 'axe-core';
const readFile = promisify(fs.readFile);

// Streaming Reporter

type MessageFormat =
  | {
      module: 'root';
    }
  | {
      msg: 'GotResults';
      module: 'results';
      results: AxeResults;
    }
  | {
      msg: 'InProgress';
      module: 'results';
      href: string;
    };

type State = {
  inProgress: string[];
  results: AxeResults[];
};

type Action =
  | {
      msg: 'GotResults';
      results: AxeResults;
    }
  | {
      msg: 'InProgress';
      href: string;
    };

const reducer: React.Reducer<State, Action> = (prevState, action) => {
  switch (action.msg) {
    case 'GotResults':
      return {
        ...prevState,
        inProgress: prevState.inProgress.filter(
          href => href !== action.results.url
        ),
        results: [...prevState.results, action.results],
      };

    case 'InProgress':
      return {
        ...prevState,
        inProgress: [...prevState.inProgress, action.href],
      };

    default:
      throw Error('Invalid action type');
  }
};

const StreamingReporter: React.FunctionComponent<{}> = ({}) => {
  // Consume stdin via context
  const {stdin} = useContext(StdinContext);
  const [state, dispatch] = useReducer(reducer, {inProgress: [], results: []});

  // Subscribe to stdin? (Wtf am I even doing here)
  useEffect(() => {
    // Use split so that each chunk is a separate line
    // This is because pino's output is NDJSON, enabling us to parse
    // and show each line at once!
    const splitStdin = stdin.pipe(split());

    const onData = (data: any) => {
      // use jsonParse instead of JSON.parse, because the latter throws
      const parsed = jsonParse<MessageFormat>(data);

      if (!parsed.err) {
        const value = parsed.value;

        if (value.module === 'results') {
          if (value.msg === 'GotResults') {
            console.log('Got results');
            dispatch({msg: 'GotResults', results: value.results});
          }
          if (value.msg === 'InProgress') {
            dispatch({msg: 'InProgress', href: value.href});
          }
        }
      }
    };

    // Add the subscription
    splitStdin.on('data', onData);

    // Cleanup
    return () => {
      splitStdin.removeListener('data', onData);
    };
  }, [stdin]);

  return <Reporter inProgress={state.inProgress} results={state.results} />;
};

// Reporter Component

type ReporterProps = {inProgress: string[]; results: AxeResults[]};

const Reporter: React.FunctionComponent<ReporterProps> = props => {
  const {results, inProgress} = props;
  const pagesPassed = useMemo(
    () =>
      results.filter(res => res.violations && res.violations.length === 0)
        .length,
    [results]
  );
  const hasPendingTests = inProgress.length;

  return (
    <Box flexDirection="column">
      {/* Results */}
      <Static>
        {results.map((result, i) => (
          <Box key={result.url} marginBottom={2}>
            <ResultRow result={result} />
          </Box>
        ))}
      </Static>

      {/* Pending */}
      {hasPendingTests ? (
        <Box flexDirection="column">
          {inProgress.map(href => (
            <Box key={href}>In progress: {href}</Box>
          ))}
        </Box>
      ) : null}

      {/* Summary */}
      <Box>
        <Text>Pages:</Text>{' '}
        <Text>
          <Color green>{pagesPassed} had no violations</Color>, {pagesPassed} of{' '}
          {results.length + inProgress.length} total
        </Text>
      </Box>
    </Box>
  );
};

type ResultRowProps = {
  result: AxeResults;
};

const ResultRow: React.FunctionComponent<ResultRowProps> = ({result}) => {
  const hasViolations = result.violations && result.violations.length !== 0;

  return (
    <Box flexDirection="column">
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
                          <Color dim key={target}>
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
    </Box>
  );
};

// Main

// TODO: Other relevant options, e.g. "showNodes"
type Options = {
  reportSource: ReportSource;
};

type ReportSource = {type: 'file'; fileName: string} | {type: 'stdin'};

async function main(opts: Options) {
  if (opts.reportSource.type === 'file') {
    // Read the data
    const reportData = await readFile(opts.reportSource.fileName, 'utf8').then(
      data => JSON.parse(data)
    );

    render(<Reporter inProgress={[]} results={reportData} />);
  } else if (opts.reportSource.type === 'stdin') {
    render(<StreamingReporter />);
  }
}

// With file
// main({reportSource: {type: 'file', fileName: process.argv[2]}});

// Streaming
main({reportSource: {type: 'stdin'}});

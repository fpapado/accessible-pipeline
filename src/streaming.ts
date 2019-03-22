/** Defines the streaming API and types, used for live reporters. */
import {AxeResults} from 'axe-core';
import {logger} from './logger';

// Create a logger for results. This is the one that gets consumed by streaming reporters.
const resultLog = logger.child({module: 'results'});

//
// Possible messages

// TODO: Define the Msg type here

export function sendInProgress(href: string, streaming?: boolean) {
  if (streaming) {
    resultLog.info({msg: 'InProgress', href});
  }
}

export function sendWroteReportFile(filename: string, streaming?: boolean) {
  if (streaming) {
    resultLog.info({
      msg: 'DisplayInfo',
      description: `Wrote the report to ${filename}. You can view it again with\n\`$ accessible-pipeline view --file ${filename}\`.`,
    });
  }
}

export function sendWroteStateFile(filename: string, streaming?: boolean) {
  if (streaming) {
    resultLog.info({
      msg: 'DisplayInfo',
      description: `Wrote the state to ${filename}. It might me useful if you want to debug which pages were visited.`,
    });
  }
}

export function sendGotResults(results: AxeResults, streaming?: boolean) {
  // Write to the results stream, after rewriting results to only keep the node targets
  // Helps avoid some odd edge cases where the JSON breaks parsing when piping, because of the HTML content
  // TODO: Declare StreamingAxeResults type, which matches the shape we actually send.
  if (streaming) {
    resultLog.info({
      msg: 'GotResults',
      results: {
        ...results,
        violations: results.violations.map(violation => ({
          ...violation,
          nodes: violation.nodes.map(node => ({
            // Only keep the target, since that's what we report on
            target: node.target,
          })),
        })),
        passes: results.passes.map(pass => ({
          ...pass,
          nodes: pass.nodes.map(node => ({
            // Only keep the target, since that's what we report on
            target: node.target,
          })),
        })),
        incomplete: results.incomplete.map(violation => ({
          ...violation,
          nodes: violation.nodes.map(node => ({
            // Only keep the target, since that's what we report on
            target: node.target,
          })),
        })),
        inapplicable: results.inapplicable.map(violation => ({
          ...violation,
          nodes: violation.nodes.map(node => ({
            // Only keep the target, since that's what we report on
            target: node.target,
          })),
        })),
      },
    });
  }
}

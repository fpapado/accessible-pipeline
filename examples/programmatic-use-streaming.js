const {runCoreStreaming} = require('..');

async function main() {
  const rootURL = new URL('https://example.com');
  const opts = {
    pageLimit: 5,
  };

  // Get the results and the state from running the core functions
  // runCoreStreaming is an async iterator
  // We loop over it, and separate each different action that we can get.
  for await (const msg of runCoreStreaming(rootURL, opts)) {
    // The type of the message is CoreStreamingMsg,
    // exported from core
    // You could use this to send items one-by-one to some other service
    // You could batch them, you could do anything with them here. Be free!
    if (msg.type === 'result') {
      console.log(`Got results: ${msg.data}`);
    }
    if (msg.type === 'state') {
      console.log(`Got state: ${msg.data}`);
    }
  }
}

main().then(x => console.log('Done'));

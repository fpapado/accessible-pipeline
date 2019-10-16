/**
 * Get launch arguments for puppeteer in CI.
 * This disables sandboxing, so it must be done intentionally!
 * @see https://discuss.circleci.com/t/puppeteer-fails-on-circleci/22650
 * @see https://github.com/GoogleChrome/puppeteer/blob/master/docs/troubleshooting.md#setting-up-chrome-linux-sandbox
 */
export function getChromiumLaunchArgs() {
  const args = [];
  if (process.env.CI) {
    args.push('--no-sandbox', '--disable-setuid-sandbox');
  }
  return args;
}

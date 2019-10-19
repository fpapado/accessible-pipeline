import * as path from 'path';
import {createServer, Server} from 'http';
import express from 'express';
import {AddressInfo} from 'net';
import {runCore} from '../src/core';
import {getChromiumLaunchArgs} from './utils';

describe('basic', () => {
  let server: Server;
  let getUrlForFixture: (filename: string) => string;

  beforeAll(async done => {
    const app: express.Application = express();
    app.use(express.static(path.resolve(__dirname, 'fixtures', 'basic')));
    server = createServer(app);

    const address = await new Promise((resolve, reject) => {
      server.on('error', reject);
      server.listen(() => {
        const {port} = server.address() as AddressInfo;
        resolve(`http://localhost:${port}`);
      });
    });

    getUrlForFixture = (filename: string): string => {
      return `${address}/${filename}`;
    };

    done();
  });

  afterAll(done => {
    server.close(done);
  });

  test('visits all pages', async () => {
    const url = getUrlForFixture('homepage.html');

    const {results, state} = await runCore(new URL(url), {
      pageLimit: Infinity,
      puppeteerChromeLaunchArgs: getChromiumLaunchArgs(),
    });

    const expected = [
      getUrlForFixture('homepage.html'),
      getUrlForFixture('posts.html'),
      getUrlForFixture('about.html'),
      getUrlForFixture('?x=1'),
    ];

    // State
    expect(state.pagesVisited).toEqual(expected);
    expect(state.toVisit).toEqual([]);

    // Results
    expect(results.map(result => result.url)).toEqual(expected);
  });

  test('links with query parameters are ignored', async () => {
    const url = getUrlForFixture('homepage.html');

    const {results, state} = await runCore(new URL(url), {
      pageLimit: Infinity,
      puppeteerChromeLaunchArgs: getChromiumLaunchArgs(),
      ignoreQueryParams: true,
    });

    const expected = [
      getUrlForFixture('homepage.html'),
      getUrlForFixture('posts.html'),
      getUrlForFixture('about.html'),
    ];

    // State
    expect(state.pagesVisited).toEqual(expected);
    expect(state.toVisit).toEqual([]);

    // Results
    expect(results.map(result => result.url)).toEqual(expected);
  });
});

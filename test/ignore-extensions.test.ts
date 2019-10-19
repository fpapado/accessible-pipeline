import * as path from 'path';
import {createServer, Server} from 'http';
import express from 'express';
import {AddressInfo} from 'net';
import {runCore} from '../src/core';
import {getChromiumLaunchArgs} from './utils';

describe('ignore-extensions', () => {
  let server: Server;
  let getUrlForFixture: (filename: string) => string;

  beforeAll(async done => {
    const app: express.Application = express();
    app.use(express.static(path.resolve(__dirname, 'fixtures', 'ignoring-extensions')));
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

  test('visit all except pdf', async () => {
    const url = getUrlForFixture('index.html');

    const {results, state} = await runCore(new URL(url), {
      pageLimit: Infinity,
      puppeteerChromeLaunchArgs: getChromiumLaunchArgs(),
      ignoreExtensions: [".pdf"],
    });

    const expected = [
      getUrlForFixture('index.html'),
      getUrlForFixture('image.jpg'),
      getUrlForFixture('about.html'),
    ];

    // State
    expect(state.pagesVisited).toEqual(expected);
    expect(state.toVisit).toEqual([]);

    // Results
    expect(results.map(result => result.url)).toEqual(expected);
  });

    test('visit all except pdf and jpg', async () => {
      const url = getUrlForFixture('index.html');

      const {results, state} = await runCore(new URL(url), {
        pageLimit: Infinity,
        puppeteerChromeLaunchArgs: getChromiumLaunchArgs(),
        ignoreExtensions: [".pdf", ".jpg"],
      });

      const expected = [
        getUrlForFixture('index.html'),
        getUrlForFixture('about.html'),
      ];

      // State
      expect(state.pagesVisited).toEqual(expected);
      expect(state.toVisit).toEqual([]);

      // Results
      expect(results.map(result => result.url)).toEqual(expected);
    });
});

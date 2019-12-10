import * as path from 'path';
import {createServer, Server} from 'http';
import express from 'express';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import {AddressInfo} from 'net';
import {runCore} from '../src/core';
import {getChromiumLaunchArgs} from './utils';
import * as Puppetter from 'puppeteer';

describe('basic', () => {
  let server: Server;
  let getUrlForFixture: (filename: string) => string;

  beforeAll(async done => {
    const app: express.Application = express();
    const users = new Map();
    users.set('user', {password: 'password'});

    app.use(express.static(path.resolve(__dirname, 'fixtures', 'with-auth')));
    server = createServer(app);

    // initialize body-parser to parse incoming parameters requests to req.body
    app.use(bodyParser.urlencoded({extended: true}));

    // initialize cookie-parser to allow us access the cookies stored in the browser.
    app.use(cookieParser());

    app.use(
      session({
        key: 'user_sid',
        secret: 'somerandonstuffs',
        resave: false,
        saveUninitialized: false,
        cookie: {
          expires: 600000,
        },
      })
    );

    app.use((req, res, next) => {
      if (req.cookies.user_sid && !req['session'].user) {
        res.clearCookie('user_sid');
      }
      next();
    });

    // middleware function to check for logged-in users
    const sessionChecker = (req, res, next) => {
      if (req.session.user && req.cookies.user_sid) {
        res.redirect('/with-auth');
      } else {
        next();
      }
    };

    // Gate the '/with-auth' behind a cookie
    app.get('/with-auth', sessionChecker, (req, res) => {
      res.redirect('/');
    });

    // route for user Login
    app.route('/login').post((req, res) => {
      const username = req.body.username;
      const password = req.body.password;

      const user = users.get(username);

      if (!user) {
        res.redirect('/');
      } else if (!user.validPassword(password)) {
        res.redirect('/');
      } else {
        req['session'].user = user.dataValues;
        res.redirect('/with-auth');
      }
    });

    // Start the server
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

  test('visits all the pages', async () => {
    const url = getUrlForFixture('index.html');

    const {results, state} = await runCore(new URL(url), {
      pageLimit: Infinity,
      puppeteerChromeLaunchArgs: getChromiumLaunchArgs(),
      // A custom "log in" phase
      onBeforeAssertions: async (page: Puppetter.Page) => {
        const url = new URL(page.url());
        if (url.pathname === 'index.html' || url.pathname === '/') {
          await page.$eval('form', (form: HTMLFormElement) => {
            // Fill out the username and password
            (form.querySelector(
              'input[name="username"]'
            ) as HTMLInputElement).value = 'username';
            (form.querySelector(
              'input[name="password"]'
            ) as HTMLInputElement).value = 'password';
            console.log('FORM', form);
            form.submit();
          });
        }
      },
    });

    const expected = [
      getUrlForFixture('index.html'),
      getUrlForFixture('with-auth.html'),
    ];

    // State
    expect(state.pagesVisited).toEqual(expected);
    expect(state.toVisit).toEqual([]);

    // Results
    expect(results.map(result => result.url)).toEqual(expected);
  });
});

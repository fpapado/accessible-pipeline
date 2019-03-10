# Accessible Pipeline

> Acceessibility on CI, made easy

## Motivation

Some accessibility issues can be caught automatically. Things like correct labels, regions, and colour contrast are things that are important to a large amount of users. Still, keeping track of them can get out of hand. Even if a project is "made accessible" at one instant in time, there is no guarantee that issues will not creep back in. For those cases, automated accessibility checks can help!

Getting accessibility checks running consistently is hard. Well, not hard, but perhaps a mix of daunting and undocumented.
This project tries to change that. We use the established AxE engine in Puppetteer, and we handle a lot of the crawling of pages. By providing a manifest of routes, and a starting URL, you should be able to get a good overview of your pages.

Furthermore, having a solid series of scripts does not say much about running it in CI. Documentation, automation, and concrete references are all things that we want to provide, to make setting up these checks straightforward.

## Getting started

You will need node and npm.

In a console, run:

```shell
npm install
```

Run the crawler with a url:

```shell
npm run single https://example.com
```

View a stored report:

```shell
npm run report report-XYZ.json
```

## Report Format

The Report is a JSON list of the AxE results. Each entry has a list of violations, passes etc. It also has a `url`.
You can use this JSON file to output to any final format you want. The example one uses the CLI, but you could also build a static site on top of that, or serve it with a server as an API.

## Debugging

If you want to inspect which pages where visited, and what the options were, the program outputs its state as `state-{POSIX_TIME}.json`. It gives a good overview, and could be used to pin down bugs or new heuristics.

Generally, if you want to debug some state and errors **consider running without the reporter**, by specifying `--ci`. This will give you the "raw" output JSON on the console.

You can also set the logging level with `LOG_LEVEL`. The default is "info", which outputs operational information. Consider `debug` or `trace` to get more insight into the various loops and decisions:

```shell
LOG_LEVEL=debug accessible-pipeline run https://example.com --ci
```

If you are running with `--ci` (but not `--streaming`, which relies on the JSON console log) and want a more readable console output, then you can specify `DEBUG_LOG_PRETTY=true` on the cli.
This can be useful if you are trying to debug a specific page on your own machine:

```shell
# Will have more human-readable output, but not the reporter
DEBUG_LOG_PRETTY=true accessible-pipeline run https://example.com --ci

# Will exit with an error, because --streaming is meant to forward the logs somewhere for a computer to parse, and it would be undefined behaviour
DEBUG_LOG_PRETTY=true accessible-pipeline run https://example.com --ci --streaming
```

## Architecture

### CLI

- `run`
- `view`

They are made to be independent.
You can pipe one into the other, communicating with a common format via `--streaming`:

```shell
accessible-pipeline run https://example.com --ci --streaming | accessible-pipeline view --streaming
```

Adding `--ci` to `run` means that it will run without a "pretty" reporter, and rather output the raw console logs (formatted as NDJSON, using pino).

On the other hand, if you run `run` standalone (without `--ci`), then we assume that you might be interested in a readable output. For that reason, the reporter (`view`) is integrated, essentially automating the commands above:

- Standalone `run` is invoked
- Start a process of `run --ci --streaming`, and forwarding the other options
- Start a proces of `view --streaming`
- Pipe the output of the first one into the second
- Pipe the output into the terminal

Regardless of how you invoke `run`, the final `state` and `report` are written to a file.
This allows you to consume the reports in other ways, such as by building a static site, running `accessible-pipeline view --file`, or however you wish!

## Roadmap

## Contributing

## Thanks and Inspiration

- Deque, for axe-core and axe-puppeteer

## License

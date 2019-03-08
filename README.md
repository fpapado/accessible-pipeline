# Accessible Pipeline

> Acceessibility on CI, made easy

## Motivation

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

## Roadmap

## Contributing

## Thanks and Inspiration

- Deque, for axe-core and axe-puppeteer

## License

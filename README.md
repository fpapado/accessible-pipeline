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

## Roadmap

## Contributing

## Thanks and Inspiration

- Deque, for axe-core and axe-puppeteer

## License

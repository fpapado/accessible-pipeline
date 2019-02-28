const matchit = require('matchit');

const manifest = [
  '/:season',
  '/:season/teams',
  '/:season/:eventId',
  '/:season/:eventId/games',
];

const hrefs = [
  '/2018',
  '/2018/saskatoon',
  '/2018/saskatoon/games',
  '/2018/teams',
  '/2018/saskatoon/forgot-this-route',
];

function main(manifest) {
  const routes = manifest.map(matchit.parse);
  const matchesRoute = str => matchit.match(str, routes);

  const routesVisited = new Set();

  hrefs.forEach(href => {
    const routeMatch = matchesRoute(href);

    // No route found
    if (!routeMatch.length) {
      console.info(href, 'No route found, will add verbatim');
    } else {
      const {old: matchedRoute} = routeMatch[0];

      // Matches some route, add it to the 'visited' array
      console.log({
        href,
        matches: matchedRoute,
        haveVisited: routesVisited.has(matchedRoute),
      });

      if (!routesVisited.has(matchedRoute)) {
        // Add to the routes
        routesVisited.add(matchedRoute);
      }
    }
  });
}

main(manifest);

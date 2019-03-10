import createLogger from 'pino';

const LOG_PRETTY = process.env.LOG_PRETTY === 'true';
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';

export const logger = createLogger({
  prettyPrint: LOG_PRETTY,
  level: LOG_LEVEL,
});

import createLogger from 'pino';

const DEBUG_LOG_PRETTY = process.env.DEBUG_LOG_PRETTY === 'true';
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';

export const logger = createLogger({
  prettyPrint: DEBUG_LOG_PRETTY,
  level: LOG_LEVEL,
});

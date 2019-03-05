import createLogger from 'pino';

const IS_PROD = process.env.NODE_ENV === 'production';
const LOG_LEVEL = process.env.LOG_LEVEL;

export const logger = createLogger({prettyPrint: !IS_PROD, level: LOG_LEVEL});

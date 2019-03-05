import createLogger from 'pino';

const IS_PROD = process.env.NODE_ENV === 'production';

export const logger = createLogger({prettyPrint: !IS_PROD});

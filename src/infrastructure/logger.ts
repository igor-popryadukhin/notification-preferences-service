import pino from 'pino';
import { config } from '../config.js';

export const logger = pino({
  level: config.log.level,
  ...(process.env.NODE_ENV === 'development' && {
    transport: {
      target: 'pino-pretty',
      options: { colorize: true },
    },
  }),
});

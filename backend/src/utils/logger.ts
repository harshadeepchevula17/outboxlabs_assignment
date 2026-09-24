import pino from 'pino';
import { config } from '../config/env';

export const logger = pino({
  level: config.NODE_ENV === 'test' ? 'silent' : 'info',
  transport:
    config.NODE_ENV === 'development'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            ignore: 'pid,hostname',
            translateTime: 'SYS:yyyy-mm-dd HH:MM:ss.l',
          },
        }
      : undefined,
  redact: ['smtpPassword', 'ETHEREAL_PASSWORD', 'REDIS_PASSWORD', 'headers.authorization'],
});

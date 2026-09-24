import { Redis, RedisOptions } from 'ioredis';
import { config } from './env';
import { logger } from '../utils/logger';

export const getRedisOptions = (): RedisOptions => {
  const isUpstash = config.REDIS_HOST.includes('upstash.io');
  const useTls = config.REDIS_TLS || isUpstash;

  const options: RedisOptions = {
    host: config.REDIS_HOST,
    port: config.REDIS_PORT,
    password: config.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    retryStrategy: (times: number) => {
      const delay = Math.min(times * 200, 3000);
      logger.warn({ attempt: times, delay }, 'Retrying Redis connection...');
      return delay;
    },
  };

  if (useTls) {
    options.tls = {};
  }

  return options;
};

// Safe startup diagnostic (never logs password)
logger.info(
  {
    host: config.REDIS_HOST,
    port: config.REDIS_PORT,
    tls: config.REDIS_TLS || config.REDIS_HOST.includes('upstash.io'),
    password: config.REDIS_PASSWORD ? 'configured' : 'none',
  },
  'Initializing centralized Redis connection...'
);

export const redisConnection = new Redis(getRedisOptions());

redisConnection.on('connect', () => {
  logger.info(
    {
      host: config.REDIS_HOST,
      port: config.REDIS_PORT,
      tls: config.REDIS_TLS || config.REDIS_HOST.includes('upstash.io'),
    },
    'Redis connected successfully'
  );
});

redisConnection.on('error', (err) => {
  logger.error({ err: err.message }, 'Redis connection error');
});

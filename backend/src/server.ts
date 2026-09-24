import { createApp } from './app';
import { config } from './config/env';
import { logger } from './utils/logger';
import { startEmailWorker } from './workers/emailWorker';

const app = createApp();

const server = app.listen(config.PORT, () => {
  logger.info({ port: config.PORT, env: config.NODE_ENV }, `🚀 OutboxLabs API server running on port ${config.PORT}`);
});

// Start embedded worker process alongside API server for convenience in development/testing
logger.info('Initializing BullMQ email worker worker pool...');
const emailWorker = startEmailWorker();

const gracefulShutdown = async (signal: string) => {
  logger.info({ signal }, 'Shutting down gracefully...');
  server.close(async () => {
    logger.info('HTTP server closed.');
    await emailWorker.close();
    logger.info('BullMQ worker closed.');
    process.exit(0);
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

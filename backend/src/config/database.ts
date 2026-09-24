import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

export const prisma = new PrismaClient({
  log: [
    { emit: 'event', level: 'error' },
    { emit: 'event', level: 'warn' },
  ],
});

prisma.$on('error' as never, (e: any) => {
  logger.error({ err: e }, 'Prisma error');
});

prisma.$on('warn' as never, (e: any) => {
  logger.warn({ warning: e }, 'Prisma warning');
});

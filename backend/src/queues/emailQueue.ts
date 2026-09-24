import { Queue } from 'bullmq';
import { redisConnection } from '../config/redis';
import { EmailJobData } from '../types/index';
import { logger } from '../utils/logger';

export const QUEUE_NAME = 'emailQueue';

export const emailQueue = new Queue<EmailJobData>(QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: false,
    removeOnFail: false,
  },
});

emailQueue.on('error', (err) => {
  logger.error({ err }, 'BullMQ emailQueue error');
});

export class EmailQueueService {
  /**
   * Adds a delayed email job to BullMQ using emailId as jobId.
   */
  static async scheduleEmailJob(emailId: string, scheduledAt: Date) {
    const delay = Math.max(0, scheduledAt.getTime() - Date.now());

    const job = await emailQueue.add(
      'send-email',
      { emailId },
      {
        jobId: emailId,
        delay,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: false,
        removeOnFail: false,
      }
    );

    logger.info(
      {
        emailId,
        jobId: job.id,
        delayMs: delay,
        scheduledAt: scheduledAt.toISOString(),
      },
      'EMAIL_SCHEDULED BullMQ delayed job created'
    );

    return job;
  }

  /**
   * Removes/cancels a delayed BullMQ job if present.
   */
  static async cancelEmailJob(emailId: string): Promise<boolean> {
    try {
      const job = await emailQueue.getJob(emailId);
      if (job) {
        await job.remove();
        logger.info({ emailId }, 'EMAIL_CANCELLED BullMQ job removed from queue');
        return true;
      }
      logger.warn({ emailId }, 'BullMQ job not found during cancellation (may have already run)');
      return false;
    } catch (err) {
      logger.error({ err, emailId }, 'Error cancelling BullMQ job');
      return false;
    }
  }

  /**
   * Reschedules an existing BullMQ job for rate-limit deferral.
   */
  static async rescheduleEmailJob(emailId: string, newScheduledAt: Date) {
    try {
      await this.cancelEmailJob(emailId);
      const newJob = await this.scheduleEmailJob(emailId, newScheduledAt);
      logger.info(
        { emailId, newScheduledAt: newScheduledAt.toISOString() },
        'EMAIL_RESCHEDULED BullMQ job rescheduled'
      );
      return newJob;
    } catch (err) {
      logger.error({ err, emailId }, 'Error rescheduling BullMQ job');
      throw err;
    }
  }
}

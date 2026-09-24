import { Worker, Job } from 'bullmq';
import { QUEUE_NAME } from '../queues/emailQueue';
import { redisConnection } from '../config/redis';
import { config } from '../config/env';
import { EmailJobData } from '../types/index';
import { EmailRepository } from '../repositories/email.repository';
import { SenderRepository } from '../repositories/sender.repository';
import { RateLimiterService } from '../services/rateLimiter.service';
import { SmtpService } from '../services/smtp.service';
import { EmailQueueService } from '../queues/emailQueue';
import { logger } from '../utils/logger';
import { EmailStatus } from '@prisma/client';

export const processEmailJob = async (job: Job<EmailJobData>): Promise<void> => {
  const { emailId } = job.data;
  const attemptsMade = job.attemptsMade + 1;

  logger.info({ jobId: job.id, emailId, attempt: attemptsMade }, 'JOB_STARTED Processing email job');

  // 1. Fetch authoritative email record from PostgreSQL
  const email = await EmailRepository.findById(emailId);
  if (!email) {
    logger.error({ emailId, jobId: job.id }, 'Email record not found in PostgreSQL');
    return;
  }

  // 2. Idempotency Check: Ignore if already SENT or CANCELLED
  if (email.status === EmailStatus.SENT) {
    logger.info({ emailId, status: email.status }, 'Email already sent, skipping duplicate job');
    return;
  }

  if (email.status === EmailStatus.CANCELLED) {
    logger.info({ emailId, status: email.status }, 'Email is cancelled, skipping job');
    return;
  }

  // 3. Atomically claim job (SCHEDULED -> PROCESSING)
  // Ensures only 1 worker handles this email even if multiple pick up duplicate triggers
  if (email.status !== EmailStatus.PROCESSING) {
    const claimed = await EmailRepository.claimForProcessing(emailId);
    if (!claimed) {
      logger.warn(
        { emailId, jobId: job.id },
        'Atomic transition to PROCESSING failed (already claimed or processed by another worker)'
      );
      return;
    }
  }

  // Extract custom delay, hourly limit, and attachments from initial SCHEDULED email event metadata
  const scheduledEvent = email.events?.find((e: any) => e.event === 'SCHEDULED');
  const metadata = (scheduledEvent?.metadata as any) || {};
  const customDelayMs = metadata.delaySec ? metadata.delaySec * 1000 : undefined;
  const customHourlyLimit = metadata.hourlyLimit || undefined;
  const attachments = metadata.attachments || [];

  // 4. Distributed Throttling Check (Minimum delay between emails per sender)
  const waitMs = await RateLimiterService.reserveThrottleSlot(email.senderId, customDelayMs);
  if (waitMs > 0) {
    logger.info(
      { emailId, senderId: email.senderId, waitMs },
      'Throttling email send to respect delay between emails'
    );
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }

  // 5. Hourly Rate Limit Check
  const rateCheck = await RateLimiterService.checkAndIncrementHourlyLimit(email.senderId, customHourlyLimit);
  if (!rateCheck.allowed) {
    logger.warn(
      {
        emailId,
        senderId: email.senderId,
        hourWindow: rateCheck.hourWindow,
        nextWindowStart: rateCheck.nextWindowStart.toISOString(),
      },
      'RATE_LIMITED Sender hourly limit exceeded. Rescheduling to next window.'
    );

    // Update DB status to SCHEDULED with new scheduledAt & log events
    await EmailRepository.rescheduleForRateLimit(
      emailId,
      rateCheck.nextWindowStart,
      email.senderId,
      rateCheck.hourWindow
    );

    // Reschedule BullMQ job to next hour start window
    await EmailQueueService.rescheduleEmailJob(emailId, rateCheck.nextWindowStart);

    return;
  }

  // 6. Fetch Sender details (with SMTP credentials)
  const sender = await SenderRepository.findById(email.senderId);
  if (!sender) {
    const errorMsg = `Sender with ID ${email.senderId} no longer exists`;
    logger.error({ emailId, senderId: email.senderId }, errorMsg);
    await EmailRepository.markFailed(emailId, attemptsMade, errorMsg);
    return;
  }

  // 7. Dispatch Email via Nodemailer SMTP
  try {
    const result = await SmtpService.sendEmail({
      smtpConfig: {
        host: sender.smtpHost,
        port: sender.smtpPort,
        user: sender.smtpUser,
        pass: sender.smtpPassword,
      },
      fromName: sender.name,
      fromEmail: sender.email,
      toEmail: email.toEmail,
      subject: email.subject,
      body: email.body,
      attachments,
    });

    // 8. Mark as SENT in DB
    await EmailRepository.markSent(emailId, attemptsMade, result.previewUrl);
    logger.info(
      { emailId, jobId: job.id, messageId: result.messageId, previewUrl: result.previewUrl },
      'EMAIL_SENT Email successfully delivered'
    );
  } catch (err: any) {
    const errorMessage = err?.message || 'SMTP sending failed';
    logger.error({ err, emailId, jobId: job.id, attempt: attemptsMade }, 'SMTP send error');

    const maxAttempts = job.opts.attempts || 3;
    if (attemptsMade >= maxAttempts) {
      await EmailRepository.markFailed(emailId, attemptsMade, errorMessage);
      logger.error(
        { emailId, jobId: job.id, attemptsMade },
        'EMAIL_FAILED Max attempts reached. Marked as FAILED.'
      );
    } else {
      // Throw error to trigger BullMQ backoff retry
      throw new Error(`SMTP Send Failure (Attempt ${attemptsMade}/${maxAttempts}): ${errorMessage}`);
    }
  }
};

export const startEmailWorker = () => {
  const concurrency = config.WORKER_CONCURRENCY;

  const worker = new Worker<EmailJobData>(QUEUE_NAME, processEmailJob, {
    connection: redisConnection,
    concurrency,
  });

  worker.on('ready', () => {
    logger.info({ concurrency }, `BullMQ Email Worker running with concurrency ${concurrency}`);
  });

  worker.on('failed', (job, err) => {
    if (job) {
      logger.warn(
        { jobId: job.id, emailId: job.data.emailId, attempt: job.attemptsMade, err: err.message },
        'Job attempt failed in BullMQ worker'
      );
    }
  });

  worker.on('error', (err) => {
    logger.error({ err }, 'Unhandled worker error');
  });

  return worker;
};

// If invoked directly from command line (e.g. npm run worker)
if (process.argv[1]?.endsWith('emailWorker.ts') || process.argv[1]?.endsWith('emailWorker.js')) {
  logger.info('Starting standalone BullMQ Email Worker...');
  startEmailWorker();
}

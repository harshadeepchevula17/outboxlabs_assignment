import { EmailRepository } from '../repositories/email.repository';
import { SenderRepository } from '../repositories/sender.repository';
import { EmailQueueService } from '../queues/emailQueue';
import { ScheduleEmailInput, ListEmailQuery } from '../schemas/email.schema';
import { EmailStatus } from '@prisma/client';

export class AppError extends Error {
  constructor(public statusCode: number, public code: string, message: string) {
    super(message);
    this.name = 'AppError';
  }
}

export class EmailService {
  static async scheduleEmail(input: ScheduleEmailInput, userId: string) {
    // 1. Verify Sender exists for this user
    const sender = await SenderRepository.findById(input.senderId, userId);
    if (!sender) {
      throw new AppError(404, 'SENDER_NOT_FOUND', `Sender with ID ${input.senderId} not found`);
    }

    // 2. Ensure scheduledAt date object is valid
    let scheduledAt = input.scheduledAt;
    if (isNaN(scheduledAt.getTime())) {
      throw new AppError(400, 'INVALID_SCHEDULED_AT', 'Invalid date for scheduledAt');
    }

    // If scheduledAt is in the past by > 1 minute, handle gracefully by setting to now
    if (scheduledAt.getTime() < Date.now() - 60000) {
      scheduledAt = new Date();
    }

    // 3. Create authoritative DB record
    const email = await EmailRepository.create({
      userId,
      senderId: input.senderId,
      toEmail: input.toEmail,
      subject: input.subject,
      body: input.body,
      scheduledAt,
      attachments: input.attachments,
      delaySec: input.delaySec,
      hourlyLimit: input.hourlyLimit,
    });

    // 4. Enqueue BullMQ delayed job
    const job = await EmailQueueService.scheduleEmailJob(email.id, scheduledAt);

    return {
      email,
      scheduling: {
        jobId: job.id,
        scheduledAt: scheduledAt.toISOString(),
        delayMs: Math.max(0, scheduledAt.getTime() - Date.now()),
      },
    };
  }

  static async listEmails(query: ListEmailQuery, userId: string) {
    return EmailRepository.findAll(query, userId);
  }

  static async getEmailById(id: string, userId: string) {
    const email = await EmailRepository.findById(id, userId);
    if (!email) {
      throw new AppError(404, 'EMAIL_NOT_FOUND', `Email with ID ${id} not found`);
    }
    return email;
  }

  static async cancelEmail(id: string, userId: string) {
    const email = await EmailRepository.findById(id, userId);
    if (!email) {
      throw new AppError(404, 'EMAIL_NOT_FOUND', `Email with ID ${id} not found`);
    }

    if (email.status !== EmailStatus.SCHEDULED) {
      throw new AppError(
        400,
        'CANNOT_CANCEL_EMAIL',
        `Email cannot be cancelled because its status is ${email.status}`
      );
    }

    // 1. Cancel BullMQ job
    await EmailQueueService.cancelEmailJob(id);

    // 2. Update DB state
    const cancelledEmail = await EmailRepository.cancel(id, userId);

    return cancelledEmail;
  }

  static async getDashboardStats(userId: string) {
    return EmailRepository.getDashboardStats(userId);
  }
}

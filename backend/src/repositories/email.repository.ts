import { prisma } from '../config/database';
import { EmailStatus, EmailEventType, Prisma } from '@prisma/client';
import { ListEmailQuery } from '../schemas/email.schema';

export class EmailRepository {
  static async create(data: {
    userId: string;
    senderId: string;
    toEmail: string;
    subject: string;
    body: string;
    scheduledAt: Date;
    attachments?: Array<{ filename: string; content: string; contentType?: string }>;
    delaySec?: number;
    hourlyLimit?: number;
  }) {
    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const email = await tx.email.create({
        data: {
          userId: data.userId,
          senderId: data.senderId,
          toEmail: data.toEmail,
          subject: data.subject,
          body: data.body,
          scheduledAt: data.scheduledAt,
          status: EmailStatus.SCHEDULED,
        },
      });

      await tx.emailEvent.create({
        data: {
          emailId: email.id,
          event: EmailEventType.SCHEDULED,
          metadata: {
            scheduledAt: data.scheduledAt.toISOString(),
            attachments: data.attachments || [],
            delaySec: data.delaySec,
            hourlyLimit: data.hourlyLimit,
          },
        },
      });

      return email;
    });
  }

  static async findById(id: string, userId?: string) {
    return prisma.email.findFirst({
      where: userId ? { id, userId } : { id },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            smtpHost: true,
            smtpPort: true,
          },
        },
        events: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  static async findAll(query: ListEmailQuery, userId?: string) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const status = query.status;
    const search = query.search;
    const senderId = query.senderId;

    const skip = (page - 1) * limit;

    const where: Prisma.EmailWhereInput = {};

    if (userId) {
      where.userId = userId;
    }

    if (status) {
      where.status = status;
    }

    if (senderId) {
      where.senderId = senderId;
    }

    if (search && typeof search === 'string' && search.trim() !== '') {
      where.OR = [
        { toEmail: { contains: search, mode: 'insensitive' } },
        { subject: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.email.findMany({
        where,
        skip,
        take: limit,
        orderBy: { scheduledAt: 'desc' },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
      prisma.email.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * CRITICAL IDEMPOTENCY METHOD:
   * Atomically transitions status from SCHEDULED to PROCESSING.
   * Returns true if successfully claimed by this worker, false otherwise.
   */
  static async claimForProcessing(id: string): Promise<boolean> {
    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const result = await tx.email.updateMany({
        where: {
          id,
          status: EmailStatus.SCHEDULED,
        },
        data: {
          status: EmailStatus.PROCESSING,
        },
      });

      if (result.count > 0) {
        await tx.emailEvent.create({
          data: {
            emailId: id,
            event: EmailEventType.PROCESSING,
            metadata: { claimedAt: new Date().toISOString() },
          },
        });
        return true;
      }

      return false;
    });
  }

  static async markSent(id: string, attempts: number, etherealPreviewUrl?: string) {
    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const now = new Date();
      const email = await tx.email.update({
        where: { id },
        data: {
          status: EmailStatus.SENT,
          attempts,
          sentAt: now,
          etherealPreviewUrl: etherealPreviewUrl || null,
        },
      });

      await tx.emailEvent.create({
        data: {
          emailId: id,
          event: EmailEventType.SENT,
          metadata: {
            attempts,
            sentAt: now.toISOString(),
            etherealPreviewUrl,
          },
        },
      });

      return email;
    });
  }

  static async markFailed(id: string, attempts: number, error: string) {
    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const now = new Date();
      const email = await tx.email.update({
        where: { id },
        data: {
          status: EmailStatus.FAILED,
          attempts,
          failedAt: now,
          error,
        },
      });

      await tx.emailEvent.create({
        data: {
          emailId: id,
          event: EmailEventType.FAILED,
          metadata: {
            attempts,
            failedAt: now.toISOString(),
            error,
          },
        },
      });

      return email;
    });
  }

  static async rescheduleForRateLimit(
    id: string,
    newScheduledAt: Date,
    senderId: string,
    hourWindow: string
  ) {
    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const email = await tx.email.update({
        where: { id },
        data: {
          status: EmailStatus.SCHEDULED,
          scheduledAt: newScheduledAt,
        },
      });

      await tx.emailEvent.create({
        data: {
          emailId: id,
          event: EmailEventType.RATE_LIMITED,
          metadata: {
            senderId,
            exceededHourWindow: hourWindow,
          },
        },
      });

      await tx.emailEvent.create({
        data: {
          emailId: id,
          event: EmailEventType.RESCHEDULED,
          metadata: {
            rescheduledTo: newScheduledAt.toISOString(),
          },
        },
      });

      return email;
    });
  }

  static async cancel(id: string, userId?: string) {
    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const email = await tx.email.update({
        where: userId ? { id, userId } : { id },
        data: {
          status: EmailStatus.CANCELLED,
        },
      });

      await tx.emailEvent.create({
        data: {
          emailId: id,
          event: EmailEventType.CANCELLED,
          metadata: { cancelledAt: new Date().toISOString() },
        },
      });

      return email;
    });
  }

  static async getDashboardStats(userId?: string) {
    const baseWhere = userId ? { userId } : undefined;

    const [scheduled, processing, sent, failed, total, recentEvents] = await Promise.all([
      prisma.email.count({ where: baseWhere ? { ...baseWhere, status: EmailStatus.SCHEDULED } : { status: EmailStatus.SCHEDULED } }),
      prisma.email.count({ where: baseWhere ? { ...baseWhere, status: EmailStatus.PROCESSING } : { status: EmailStatus.PROCESSING } }),
      prisma.email.count({ where: baseWhere ? { ...baseWhere, status: EmailStatus.SENT } : { status: EmailStatus.SENT } }),
      prisma.email.count({ where: baseWhere ? { ...baseWhere, status: EmailStatus.FAILED } : { status: EmailStatus.FAILED } }),
      prisma.email.count({ where: baseWhere || undefined }),
      prisma.emailEvent.findMany({
        where: baseWhere
          ? {
              email: {
                userId: baseWhere.userId,
              },
            }
          : undefined,
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          email: {
            select: {
              toEmail: true,
              subject: true,
            },
          },
        },
      }),
    ]);

    const recentActivity = recentEvents.map((evt: any) => ({
      id: evt.id,
      emailId: evt.emailId,
      event: evt.event,
      createdAt: evt.createdAt,
      toEmail: evt.email?.toEmail,
      subject: evt.email?.subject,
    }));

    return {
      scheduled,
      processing,
      sent,
      failed,
      total,
      recentActivity,
    };
  }
}

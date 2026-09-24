import { prisma } from '../config/database';
import { CreateSenderInput } from '../schemas/sender.schema';

export class SenderRepository {
  static async create(data: CreateSenderInput & { userId: string }) {
    return prisma.sender.create({
      data,
    });
  }

  static async findById(id: string, userId?: string) {
    return prisma.sender.findFirst({
      where: userId ? { id, userId } : { id },
    });
  }

  static async findByEmail(email: string, userId?: string) {
    return userId
      ? prisma.sender.findFirst({
          where: { userId, email },
        })
      : prisma.sender.findFirst({
          where: { email },
        });
  }

  static async findAll(userId?: string) {
    return prisma.sender.findMany({
      where: userId ? { userId } : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { emails: true },
        },
      },
    });
  }

  static async delete(id: string, userId?: string) {
    return prisma.sender.delete({
      where: userId ? { id, userId } : { id },
    });
  }

  static sanitize(sender: Record<string, any>) {
    const { smtpPassword, ...safeSender } = sender;
    return safeSender;
  }
}

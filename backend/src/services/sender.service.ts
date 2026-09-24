import { SenderRepository } from '../repositories/sender.repository';
import { CreateSenderInput, AutoGenerateSenderInput } from '../schemas/sender.schema';
import { SmtpService } from './smtp.service';
import { RateLimiterService } from './rateLimiter.service';
import { AppError } from './email.service';

export class SenderService {
  static async createSender(input: CreateSenderInput, userId: string) {
    const existing = await SenderRepository.findByEmail(input.email, userId);
    if (existing) {
      throw new AppError(409, 'SENDER_EXISTS', `Sender with email ${input.email} already exists for this user`);
    }

    const sender = await SenderRepository.create({ ...input, userId });
    return SenderRepository.sanitize(sender);
  }

  static async autoGenerateSender(input: AutoGenerateSenderInput, userId: string) {
    const existing = await SenderRepository.findByEmail(input.email, userId);
    if (existing) {
      throw new AppError(409, 'SENDER_EXISTS', `Sender with email ${input.email} already exists for this user`);
    }

    const etherealAccount = await SmtpService.createEtherealAccount();

    const sender = await SenderRepository.create({
      userId,
      name: input.name,
      email: input.email,
      smtpHost: etherealAccount.smtpHost,
      smtpPort: etherealAccount.smtpPort,
      smtpUser: etherealAccount.user,
      smtpPassword: etherealAccount.pass,
    });

    return {
      sender: SenderRepository.sanitize(sender),
      etherealWebUrl: etherealAccount.webUrl,
    };
  }

  static async getAllSenders(userId: string) {
    const senders = await SenderRepository.findAll(userId);
    const result = await Promise.all(
      senders.map(async (sender: any) => {
        const rateLimit = await RateLimiterService.getSenderRateLimitStatus(sender.id);
        const sanitized = SenderRepository.sanitize(sender);
        return {
          ...sanitized,
          rateLimit,
        };
      })
    );
    return result;
  }

  static async getSenderById(id: string, userId: string) {
    const sender = await SenderRepository.findById(id, userId);
    if (!sender) {
      throw new AppError(404, 'SENDER_NOT_FOUND', `Sender with ID ${id} not found`);
    }
    const rateLimit = await RateLimiterService.getSenderRateLimitStatus(id);
    return {
      ...SenderRepository.sanitize(sender),
      rateLimit,
    };
  }

  static async deleteSender(id: string, userId: string) {
    const sender = await SenderRepository.findById(id, userId);
    if (!sender) {
      throw new AppError(404, 'SENDER_NOT_FOUND', `Sender with ID ${id} not found`);
    }

    await SenderRepository.delete(id, userId);
    return { id, message: 'Sender deleted successfully' };
  }

  static async getSenderRateLimit(id: string, userId: string) {
    const sender = await SenderRepository.findById(id, userId);
    if (!sender) {
      throw new AppError(404, 'SENDER_NOT_FOUND', `Sender with ID ${id} not found`);
    }

    return RateLimiterService.getSenderRateLimitStatus(id);
  }
}

import { z } from 'zod';

export const createSenderSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid sender email address'),
  smtpHost: z.string().min(1, 'SMTP host is required').default('smtp.ethereal.email'),
  smtpPort: z.coerce.number().int().positive().default(587),
  smtpUser: z.string().min(1, 'SMTP user is required'),
  smtpPassword: z.string().min(1, 'SMTP password is required'),
});

export const autoGenerateSenderSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid sender email address'),
});

export const senderIdParamSchema = z.object({
  id: z.string().uuid('Invalid sender ID format'),
});

export type CreateSenderInput = z.infer<typeof createSenderSchema>;
export type AutoGenerateSenderInput = z.infer<typeof autoGenerateSenderSchema>;

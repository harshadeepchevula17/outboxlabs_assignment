import { z } from 'zod';
import { EmailStatus } from '@prisma/client';

export const scheduleEmailSchema = z.object({
  senderId: z.string().uuid('Invalid sender ID format'),
  toEmail: z.string().email('Invalid recipient email address'),
  subject: z.string().min(1, 'Subject is required').max(255, 'Subject exceeds maximum length of 255 characters'),
  body: z.string().min(1, 'Email body is required'),
  scheduledAt: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), {
      message: 'Invalid ISO date string format for scheduledAt',
    })
    .transform((val) => new Date(val)),
});

export const listEmailQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.nativeEnum(EmailStatus).optional(),
  search: z.string().optional(),
  senderId: z.string().uuid().optional(),
});

export const emailIdParamSchema = z.object({
  id: z.string().uuid('Invalid email ID format'),
});

export type ScheduleEmailInput = z.infer<typeof scheduleEmailSchema>;
export type ListEmailQuery = z.infer<typeof listEmailQuerySchema>;

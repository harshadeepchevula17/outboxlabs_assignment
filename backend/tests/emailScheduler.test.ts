import { describe, it, expect } from 'vitest';
import { scheduleEmailSchema } from '../src/schemas/email.schema';
import { RateLimiterService } from '../src/services/rateLimiter.service';

describe('Email Scheduler Unit & Schema Validation Tests', () => {
  it('should validate valid email schedule request payload', () => {
    const payload = {
      senderId: '123e4567-e89b-12d3-a456-426614174000',
      toEmail: 'recipient@example.com',
      subject: 'Weekly Report',
      body: 'Here is your weekly report data.',
      scheduledAt: new Date(Date.now() + 3600000).toISOString(),
    };

    const parsed = scheduleEmailSchema.safeParse(payload);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.toEmail).toBe('recipient@example.com');
      expect(parsed.data.scheduledAt).toBeInstanceOf(Date);
    }
  });

  it('should reject malformed recipient email address', () => {
    const payload = {
      senderId: '123e4567-e89b-12d3-a456-426614174000',
      toEmail: 'invalid-email-string',
      subject: 'Test',
      body: 'Body',
      scheduledAt: new Date().toISOString(),
    };

    const parsed = scheduleEmailSchema.safeParse(payload);
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      const issues = parsed.error.issues;
      expect(issues.some((i) => i.path.includes('toEmail'))).toBe(true);
    }
  });

  it('should reject invalid date format for scheduledAt', () => {
    const payload = {
      senderId: '123e4567-e89b-12d3-a456-426614174000',
      toEmail: 'recipient@example.com',
      subject: 'Test',
      body: 'Body',
      scheduledAt: 'not-a-valid-date',
    };

    const parsed = scheduleEmailSchema.safeParse(payload);
    expect(parsed.success).toBe(false);
  });

  it('should correctly calculate start of next hour window for rate limiting', () => {
    const date = new Date('2026-09-23T18:30:15.000Z');
    const nextHour = RateLimiterService.getNextHourStart(date);
    expect(nextHour.toISOString()).toBe('2026-09-23T19:00:00.000Z');
  });

  it('should correctly format Redis hourly key', () => {
    const date = new Date('2026-09-23T18:30:15.000Z');
    const { key, hourWindow } = RateLimiterService.getHourWindowKey('sender-123', date);
    expect(key).toBe('email-rate:sender-123:2026-09-23-18');
    expect(hourWindow).toBe('2026-09-23-18');
  });
});

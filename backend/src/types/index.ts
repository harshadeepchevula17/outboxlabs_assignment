import { EmailStatus, EmailEventType } from '@prisma/client';

export interface EmailJobData {
  emailId: string;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  status?: EmailStatus;
  search?: string;
  senderId?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface DashboardStats {
  scheduled: number;
  processing: number;
  sent: number;
  failed: number;
  total: number;
  recentActivity: Array<{
    id: string;
    emailId: string;
    event: EmailEventType;
    createdAt: Date;
    toEmail?: string;
    subject?: string;
  }>;
  hourlyStats: Array<{
    hour: string;
    sent: number;
    failed: number;
    scheduled: number;
  }>;
}

export interface RateLimitStatus {
  senderId: string;
  sentThisHour: number;
  maxLimitPerHour: number;
  remainingThisHour: number;
  resetInSeconds: number;
  minDelayMs: number;
}

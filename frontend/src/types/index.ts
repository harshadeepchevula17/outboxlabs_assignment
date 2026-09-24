export type EmailStatus = 'SCHEDULED' | 'PROCESSING' | 'SENT' | 'FAILED' | 'CANCELLED';

export type EmailEventType =
  | 'SCHEDULED'
  | 'PROCESSING'
  | 'RATE_LIMITED'
  | 'RESCHEDULED'
  | 'SENT'
  | 'FAILED'
  | 'CANCELLED';

export interface Sender {
  id: string;
  name: string;
  email: string;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  createdAt: string;
  updatedAt: string;
  rateLimit?: {
    senderId: string;
    sentThisHour: number;
    maxLimitPerHour: number;
    remainingThisHour: number;
    resetInSeconds: number;
    minDelayMs: number;
  };
  _count?: {
    emails: number;
  };
}

export interface EmailEvent {
  id: string;
  emailId: string;
  event: EmailEventType;
  metadata?: any;
  createdAt: string;
}

export interface EmailItem {
  id: string;
  senderId: string;
  toEmail: string;
  subject: string;
  body: string;
  scheduledAt: string;
  status: EmailStatus;
  attempts: number;
  sentAt?: string | null;
  failedAt?: string | null;
  error?: string | null;
  etherealPreviewUrl?: string | null;
  createdAt: string;
  updatedAt: string;
  sender?: {
    id: string;
    name: string;
    email: string;
  };
  events?: EmailEvent[];
}

export interface PaginatedResponse<T> {
  success: boolean;
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
    createdAt: string;
    toEmail?: string;
    subject?: string;
  }>;
}

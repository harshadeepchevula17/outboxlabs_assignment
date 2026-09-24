import { api } from '../lib/axios';
import {
  EmailItem,
  Sender,
  PaginatedResponse,
  DashboardStats,
} from '../types';

export interface ScheduleEmailPayload {
  senderId: string;
  toEmail: string;
  subject: string;
  body: string;
  scheduledAt: string;
}

export interface CreateSenderPayload {
  name: string;
  email: string;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPassword?: string;
}

export const fetchEmails = async (params: {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
  senderId?: string;
}): Promise<PaginatedResponse<EmailItem>> => {
  const { data } = await api.get('/emails', { params });
  return data;
};

export const fetchEmailById = async (id: string): Promise<EmailItem> => {
  const { data } = await api.get(`/emails/${id}`);
  return data.data;
};

export const scheduleEmail = async (payload: ScheduleEmailPayload) => {
  const { data } = await api.post('/emails', payload);
  return data;
};

export const cancelEmail = async (id: string) => {
  const { data } = await api.delete(`/emails/${id}`);
  return data;
};

export const fetchSenders = async (): Promise<Sender[]> => {
  const { data } = await api.get('/senders');
  return data.data;
};

export const createSender = async (payload: CreateSenderPayload): Promise<Sender> => {
  const { data } = await api.post('/senders', payload);
  return data.data;
};

export const autoGenerateSender = async (payload: { name: string; email: string }) => {
  const { data } = await api.post('/senders/auto-generate', payload);
  return data;
};

export const deleteSender = async (id: string) => {
  const { data } = await api.delete(`/senders/${id}`);
  return data;
};

export const fetchDashboardStats = async (): Promise<DashboardStats> => {
  const { data } = await api.get('/dashboard/stats');
  return data.data;
};

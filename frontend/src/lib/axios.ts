import axios from 'axios';

export const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const isAuthRoute = config.url?.includes('/auth/');
  const currentToken = localStorage.getItem('outboxlabs_token');

  if (!isAuthRoute && currentToken) {
    config.headers = {
      ...config.headers,
      Authorization: `Bearer ${currentToken}`,
    };
  } else if (config.headers) {
    delete (config.headers as any).Authorization;
  }

  return config;
});

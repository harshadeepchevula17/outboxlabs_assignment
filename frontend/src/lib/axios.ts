import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const isAuthRoute = config.url?.includes('/auth/');
  const currentToken = localStorage.getItem('outboxlabs_token');

  if (!isAuthRoute && currentToken) {
    config.headers.set('Authorization', `Bearer ${currentToken}`);
  } else if (config.headers) {
    config.headers.delete('Authorization');
  }

  return config;
});

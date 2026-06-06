import axios from 'axios';

// 優先讀取環境變數 VITE_API_URL（供 Vercel 部署使用），若無則使用本機開發環境
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 自動攔截 Request 加上 JWT Token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('dinnerswipe_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

import axios from 'axios';

// 假設開發環境 FastAPI 跑在 8000 port
const API_BASE_URL = 'http://localhost:8000';

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

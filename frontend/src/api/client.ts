import axios from 'axios';

// 在 Vercel 生產環境中，axios 不指定 baseURL（設為空字串），它會自動以絕對路徑向同網域的 /api/v1/... 發送請求
// 在本機開發時，則打向本機的 FastAPI 8000 port
const API_BASE_URL = import.meta.env.MODE === 'production' ? '' : 'http://localhost:8000';

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

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

// NOTE: 自動攔截 Response，處理 401（Token 失效）
// 只有 401 才清除 token，讓 AuthContext 重新 fetchUser 時偵測到並導回登入頁
// 其他暫時性錯誤（502/503/網路超時）不影響登入狀態
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      localStorage.removeItem('dinnerswipe_token');
    }
    return Promise.reject(error);
  }
);

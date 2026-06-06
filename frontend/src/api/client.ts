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

// NOTE: 記憶體 Token 快取，作為手機端/無痕模式 localStorage 被禁用時的防禦性 fallback
let memoryToken: string | null = null;

/**
 * 安全地讀取 localStorage 中的 token
 */
export const getSafeToken = (): string | null => {
  if (memoryToken) return memoryToken;
  try {
    return localStorage.getItem('dinnerswipe_token');
  } catch (e) {
    console.warn('無法讀取 localStorage 中的 token:', e);
    return null;
  }
};

/**
 * 同步更新 Axios Headers 與本地儲存/記憶體快取
 */
export const setClientToken = (token: string | null) => {
  memoryToken = token;
  if (token) {
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    try {
      localStorage.setItem('dinnerswipe_token', token);
    } catch (e) {
      console.warn('無法寫入 token 到 localStorage:', e);
    }
  } else {
    delete apiClient.defaults.headers.common['Authorization'];
    try {
      localStorage.removeItem('dinnerswipe_token');
    } catch (e) {
      console.warn('無法從 localStorage 清除 token:', e);
    }
  }
};

// 自動攔截 Request 加上 JWT Token
apiClient.interceptors.request.use((config) => {
  const token = getSafeToken();
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
      setClientToken(null);
    }
    return Promise.reject(error);
  }
);


import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { apiClient } from '../api/client';

interface User {
  id: number;
  name: string;
  email: string;
  region: string;
  total_swipes: number;
  reputation: number;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, userData: any) => void;
  logout: () => void;
  isLoading: boolean;
  fetchUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('dinnerswipe_token'));
  const [isLoading, setIsLoading] = useState(true);

  const fetchUser = async () => {
    if (!token) {
      setIsLoading(false);
      return;
    }
    try {
      const response = await apiClient.get('/api/v1/auth/me');
      setUser(response.data);
    } catch (error: any) {
      // NOTE: 只有明確收到 401 Unauthorized 才登出（Token 真的無效或過期）
      // 其他錯誤（網路超時、Vercel 冷啟動、暫時 502/503）不應踢回登入頁，
      // 否則會造成「使用中突然閃退到登入頁面」的問題
      const status = error?.response?.status;
      if (status === 401) {
        console.warn('Token invalid or expired, logging out.');
        logout();
      } else {
        // 暫時性錯誤：保留登入狀態，讓使用者繼續使用
        console.error('Failed to fetch user (non-auth error, keeping session):', error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, [token]);

  const login = (newToken: string, userData: any) => {
    localStorage.setItem('dinnerswipe_token', newToken);
    setToken(newToken);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('dinnerswipe_token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isLoading, fetchUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

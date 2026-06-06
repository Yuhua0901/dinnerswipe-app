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
    } catch (error) {
      console.error('Failed to fetch user:', error);
      logout(); // Invalid token
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

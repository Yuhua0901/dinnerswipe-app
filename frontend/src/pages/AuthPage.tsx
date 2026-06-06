import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../api/client';

interface AuthPageProps {
  onSuccess: () => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();

  const handleSubmit = async () => {
    setError('');
    if (!password || (isLogin && !name) || (!isLogin && (!name || !email))) {
      setError('請填寫完整資訊');
      return;
    }

    try {
      if (isLogin) {
        const response = await apiClient.post('/api/v1/auth/login', { name, password });
        login(response.data.token, { id: response.data.user_id, name: response.data.name });
        onSuccess();
      } else {
        const response = await apiClient.post('/api/v1/auth/register', { name, email, password, region: '台南市東區' });
        login(response.data.token, { id: response.data.user_id, name: response.data.name });
        onSuccess();
      }
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      if (Array.isArray(detail)) {
        // 處理 Pydantic 的 422 驗證錯誤格式 (陣列)
        setError(detail[0]?.msg || '輸入格式錯誤');
      } else {
        setError(detail || '發生錯誤，請稍後再試');
      }
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-blob"></div>
      <div className="auth-blob2"></div>
      <div className="auth-logo">Dinner<span>Swipe</span></div>
      <div className="auth-tagline">讓附近的人幫你決定今晚吃什麼</div>
      <div className="auth-emoji">{isLogin ? '🌙' : '🍜'}</div>
      <div className="auth-title">{isLogin ? '歡迎回來' : '建立帳號'}</div>
      <div className="auth-sub">{isLogin ? '繼續你的晚餐決策' : '開始你的晚餐決策旅程'}</div>
      
      <div className="auth-form">
        {isLogin ? (
          <input 
            className="auth-input" 
            type="text" 
            placeholder="使用者名稱" 
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        ) : (
          <input 
            className="auth-input" 
            type="text" 
            placeholder="你的名字（顯示名稱 / 登入帳號）" 
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        )}
        
        {!isLogin && (
          <input 
            className="auth-input" 
            type="text" 
            placeholder="手機/email" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        )}
        <input 
          className="auth-input" 
          type="password" 
          placeholder={isLogin ? '密碼' : '設定密碼（至少6碼）'} 
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <div className="auth-error">{error}</div>
        
        <button className="auth-btn" onClick={handleSubmit}>
          {isLogin ? '登入 →' : '開始使用 →'}
        </button>
        
        <div className="auth-divider">或</div>
        <div className="auth-social">
          <button className="auth-social-btn" onClick={() => alert('【期末專案展示】第三方登入功能開發中，請使用一般註冊！')}>🍎 Apple</button>
          <button className="auth-social-btn" onClick={() => alert('【期末專案展示】第三方登入功能開發中，請使用一般註冊！')}>🔵 Google</button>
        </div>
      </div>
      
      <div className="auth-switch">
        {isLogin ? '還沒有帳號？' : '已有帳號？'}
        <a onClick={() => { setIsLogin(!isLogin); setError(''); }}>
          {isLogin ? '免費註冊' : '立即登入'}
        </a>
      </div>
    </div>
  );
};

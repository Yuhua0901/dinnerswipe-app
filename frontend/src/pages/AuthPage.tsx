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
  const [avatarBase64, setAvatarBase64] = useState<string>('');
  const [error, setError] = useState('');
  const { login } = useAuth();

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxSize = 150;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxSize) {
            height *= maxSize / width;
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width *= maxSize / height;
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const base64 = canvas.toDataURL('image/jpeg', 0.8);
          setAvatarBase64(base64);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    setError('');
    if (!password || (isLogin && !email) || (!isLogin && (!name || !email))) {
      setError('請填寫完整資訊');
      return;
    }

    try {
      if (isLogin) {
        const response = await apiClient.post('/api/v1/auth/login', { email, password });
        login(response.data.token, { id: response.data.user_id, name: response.data.name });
        onSuccess();
      } else {
        const response = await apiClient.post('/api/v1/auth/register', { 
          name, email, password, region: '台南市東區', avatar_base64: avatarBase64 
        });
        login(response.data.token, { id: response.data.user_id, name: response.data.name });
        onSuccess();
      }
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      if (Array.isArray(detail)) {
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
        {!isLogin && (
          <div className="avatar-upload" title="上傳大頭照">
            {avatarBase64 ? <img src={avatarBase64} alt="Avatar" /> : <div style={{fontSize: '24px'}}>📷</div>}
            <input type="file" accept="image/*" onChange={handleImageUpload} />
          </div>
        )}

        {isLogin ? (
          <input 
            className="auth-input" 
            type="text" 
            placeholder="電子信箱 (Email)" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
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

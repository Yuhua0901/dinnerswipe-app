import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../api/client';

interface AuthPageProps {
  onSuccess: () => void;
}

/**
 * 註冊/登入頁面，拆成兩個畫面：
 * 畫面一（stage='login'）：登入表單 + 輕量社會認同
 * 畫面二（stage='register'）：WHY 說服內容 + 註冊表單 + WHEN/WHERE 即時感
 */
export const AuthPage: React.FC<AuthPageProps> = ({ onSuccess }) => {
  const [stage, setStage] = useState<'login' | 'register'>('login');
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

  /** 登入 */
  const handleLogin = async () => {
    setError('');
    if (!email || !password) {
      setError('請填寫完整資訊');
      return;
    }
    try {
      const response = await apiClient.post('/api/v1/auth/login', { email, password });
      login(response.data.token, { id: response.data.user_id, name: response.data.name });
      onSuccess();
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      if (Array.isArray(detail)) {
        setError(detail[0]?.msg || '輸入格式錯誤');
      } else {
        setError(detail || '帳號或密碼錯誤');
      }
    }
  };

  /** 註冊 */
  const handleRegister = async () => {
    setError('');
    if (!name || !email || !password) {
      setError('請填寫完整資訊');
      return;
    }
    try {
      const response = await apiClient.post('/api/v1/auth/register', { 
        name, email, password, region: '台南市東區', avatar_base64: avatarBase64 
      });
      login(response.data.token, { id: response.data.user_id, name: response.data.name });
      onSuccess();
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      if (Array.isArray(detail)) {
        setError(detail[0]?.msg || '輸入格式錯誤');
      } else {
        setError(detail || '發生錯誤，請稍後再試');
      }
    }
  };

  /**
   * 切換畫面時清除表單狀態
   */
  const switchStage = (target: 'login' | 'register') => {
    setError('');
    setStage(target);
  };

  // NOTE: 畫面一 — 登入頁（簡潔 + WHO 社會認同）
  if (stage === 'login') {
    return (
      <div className="auth-page" key="login">
        <div className="auth-blob"></div>
        <div className="auth-blob2"></div>

        {/* WHAT：品牌識別 */}
        <div className="auth-logo">Dinner<span>Swipe</span></div>
        <div className="auth-tagline">讓附近的人幫你決定今晚吃什麼</div>

        <div className="auth-emoji">🌙</div>
        <div className="auth-title">歡迎回來</div>
        <div className="auth-sub">繼續你的晚餐決策</div>

        <div className="auth-form">
          <input 
            className="auth-input" 
            type="text" 
            placeholder="電子信箱 (Email)" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input 
            className="auth-input" 
            type="password" 
            placeholder="密碼" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <div className="auth-error">{error}</div>
          
          <button className="auth-btn" onClick={handleLogin}>
            登入 →
          </button>
          
          <div className="auth-divider">或</div>
          <div className="auth-social">
            <button className="auth-social-btn" onClick={() => alert('【期末專案展示】第三方登入功能開發中，請使用一般註冊！')}>🍎 Apple</button>
            <button className="auth-social-btn" onClick={() => alert('【期末專案展示】第三方登入功能開發中，請使用一般註冊！')}>🔵 Google</button>
          </div>
        </div>

        {/* WHO：輕量社會認同，僅一行統計 */}
        <div className="auth-proof-inline">
          <span className="cta-pulse"></span>
          已有 <strong>1,200+</strong> 位美食家加入
        </div>
        
        <div className="auth-switch">
          還沒有帳號？
          <a onClick={() => switchStage('register')}>免費註冊</a>
        </div>
      </div>
    );
  }

  // NOTE: 畫面二 — 註冊頁（WHY 說服 + 表單 + WHEN/WHERE）
  return (
    <div className="auth-page" key="register">
      <div className="auth-blob"></div>
      <div className="auth-blob2"></div>

      {/* 返回按鈕 */}
      <button className="auth-back" onClick={() => switchStage('login')}>
        ← 返回
      </button>

      {/* WHAT */}
      <div className="auth-logo">Dinner<span>Swipe</span></div>

      {/* WHY：為什麼選 DinnerSwipe */}
      <div className="auth-why">
        <div className="why-cards">
          <div className="why-card">
            <div className="why-icon">🎯</div>
            <div className="why-title">解決選擇困難</div>
            <div className="why-desc">滑一滑就有答案</div>
          </div>
          <div className="why-card">
            <div className="why-icon">🗺️</div>
            <div className="why-title">在地人推薦</div>
            <div className="why-desc">真實用戶，不是廣告</div>
          </div>
          <div className="why-card">
            <div className="why-icon">🧠</div>
            <div className="why-title">越滑越懂你</div>
            <div className="why-desc">推薦越來越準</div>
          </div>
        </div>
      </div>

      <div className="auth-form">
        <div className="avatar-upload" title="上傳大頭照">
          {avatarBase64 ? <img src={avatarBase64} alt="Avatar" /> : <div style={{fontSize: '24px'}}>📷</div>}
          <input type="file" accept="image/*" onChange={handleImageUpload} />
        </div>

        <input 
          className="auth-input" 
          type="text" 
          placeholder="你的名字（顯示名稱）" 
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input 
          className="auth-input" 
          type="text" 
          placeholder="電子信箱 (Email)" 
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input 
          className="auth-input" 
          type="password" 
          placeholder="設定密碼（至少6碼）" 
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <div className="auth-error">{error}</div>
        
        <button className="auth-btn" onClick={handleRegister}>
          開始使用 →
        </button>
      </div>

      {/* WHEN/WHERE：即時性 CTA */}
      <div className="auth-cta-section">
        <div className="cta-location">
          <span className="cta-pulse"></span>
          <span>📍 立即探索你周遭的熱門晚餐</span>
        </div>
      </div>

      <div className="auth-switch">
        已有帳號？
        <a onClick={() => switchStage('login')}>立即登入</a>
      </div>
    </div>
  );
};

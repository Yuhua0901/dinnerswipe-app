import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../api/client';

interface ProfileScreenProps {
  currentSwipeCount?: number;
}

interface PersonaData {
  emoji: string;
  title: string;
  desc: string;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ currentSwipeCount = 0 }) => {
  const { user, logout, fetchUser } = useAuth();
  const [profileData, setProfileData] = useState<any>(null);
  const [persona, setPersona] = useState<PersonaData>({ emoji: '🍜', title: '深夜療癒食客', desc: '疲憊的夜晚，一碗熱湯就是最好的擁抱' });
  const [soulmateCount, setSoulmateCount] = useState(0);

  const formatTimeAgo = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffHours = (now.getTime() - d.getTime()) / (1000 * 60 * 60);
    if (diffHours < 24) return '今天';
    if (diffHours < 48) return '昨天';
    return `${Math.floor(diffHours / 24)}天前`;
  };

  useEffect(() => {
    if (user?.id) {
      fetchProfile();
      fetchSoulmate();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const res = await apiClient.get(`/api/v1/user/${user?.id}/profile`);
      setProfileData(res.data);
      // NOTE: 功能1 - 從後端取得動態計算的晚餐人格
      if (res.data.persona) {
        setPersona(res.data.persona);
      }
    } catch (e) {
      console.error(e);
    }
  };

  /**
   * 功能4：從 soulmate API 取得今晚的靈魂伴侶匹配數量
   */
  const fetchSoulmate = async () => {
    try {
      const res = await apiClient.get('/api/v1/soulmate');
      setSoulmateCount(res.data.match_count || 0);
    } catch (e) {
      console.error(e);
    }
  };

  const handleLogout = () => {
    logout();
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = async () => {
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
          try {
            await apiClient.post('/api/v1/auth/me/avatar', { avatar_base64: base64 });
            fetchUser(); // 重新抓取 user 資料更新畫面
          } catch (err) {
            console.error('上傳大頭照失敗', err);
            alert('上傳大頭照失敗');
          }
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const repScore = profileData?.reputation || user?.reputation || 0;
  let repTitle = '🌱 美食菜鳥';
  let repColor = 'var(--text-m)';
  if (repScore >= 30) {
    repTitle = '👑 金舌頭';
    repColor = 'var(--amber)';
  } else if (repScore >= 10) {
    repTitle = '🔥 地區美食達人';
    repColor = 'var(--coral)';
  }

  return (
    <div className="screen active" style={{ display: 'flex' }}>
      <div className="profile-hero">
        <div 
          className="av-ring" 
          style={{ position: 'relative', cursor: 'pointer', overflow: 'hidden', padding: user?.avatar ? 0 : undefined }} 
          onClick={() => document.getElementById('avatar-upload-input')?.click()}
        >
          {user?.avatar ? <img src={user.avatar} alt="avatar" style={{width:'100%', height:'100%', objectFit:'cover', borderRadius:'50%'}} /> : (user?.name ? user.name.charAt(0) : '😴')}
          
          <input 
            id="avatar-upload-input" 
            type="file" 
            accept="image/*" 
            style={{ display: 'none' }} 
            onChange={handleImageUpload} 
          />
          <div style={{ position: 'absolute', bottom: '0', right: '50%', transform: 'translateX(50%)', background: 'rgba(0,0,0,0.5)', width: '100%', textAlign: 'center', fontSize: '10px', color: '#fff', padding: '2px 0' }}>編輯</div>
        </div>
        <div className="p-name">{user?.name || '使用者'}</div>
        <div style={{ fontWeight: 'bold', fontSize: '14px', color: repColor, marginBottom: '8px' }}>{repTitle}</div>
        
        {/* NOTE: 功能1 - 動態晚餐人格標籤 */}
        <div className="p-badge">{persona.emoji} {persona.title}</div>
        <div className="p-persona-desc">{persona.desc}</div>
      </div>
      
      <div className="stat-row">
        <div className="sc">
          <div className="sc-n">{(profileData?.total_swipes || user?.total_swipes || 0) + currentSwipeCount}</div>
          <div className="sc-l">刷過卡片</div>
        </div>
        <div className="sc">
          <div className="sc-n">{repScore}</div>
          <div className="sc-l">金舌頭聲望</div>
        </div>
        <div className="sc">
          {/* NOTE: 功能4 - 靈魂伴侶數量從 API 動態取得 */}
          <div className="sc-n">{soulmateCount}</div>
          <div className="sc-l">靈魂伴侶</div>
        </div>
      </div>

      <div className="pref-sec">
        <div className="psec-t">最愛餐點區域</div>
        <div className="pref-grid">
          {profileData?.zone_preference && Object.keys(profileData.zone_preference).length > 0 ? (
            Object.keys(profileData.zone_preference).map((zone, idx) => (
              <div key={zone} className={`pchip ${idx < 2 ? 'hot' : ''}`}>
                {idx === 0 ? '🔥 ' : ''}{zone}
              </div>
            ))
          ) : (
            <>
              <div className="pchip hot" style={{color: 'var(--text-s)', background: 'transparent', border: '1px dashed var(--warm2)'}}>尚無點餐紀錄</div>
            </>
          )}
        </div>
      </div>

      <div className="hist-sec">
        <div className="hist-t">近期決定紀錄</div>
        {profileData?.recent_decisions?.length > 0 ? (
          profileData.recent_decisions.map((dec: any, idx: number) => (
            <div key={idx} className="hist-row">
              <div className="he">🍽️</div>
              <div className="hi">
                <div className="hn">{dec.food_name}</div>
                <div className="ht">{formatTimeAgo(dec.swiped_at)}</div>
              </div>
              <div className={`hlabel ${dec.action === 'heart' ? 'h' : 'm'}`}>
                {dec.action === 'heart' ? '療癒十足' : (dec.mood_context ? dec.mood_context.split(',')[0] : '符合心情')}
              </div>
            </div>
          ))
        ) : (
          <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-s)', fontSize: '14px' }}>
            尚無近期決定紀錄，快去首頁滑卡吧！
          </div>
        )}
      </div>

      <div style={{ padding: '0 22px 24px' }}>
        <button 
          onClick={handleLogout}
          style={{ width: '100%', padding: '12px', borderRadius: '14px', border: '1px solid var(--red)', background: 'var(--red-l)', color: 'var(--red)', cursor: 'pointer', fontWeight: 600 }}
        >
          登出
        </button>
      </div>
    </div>
  );
};

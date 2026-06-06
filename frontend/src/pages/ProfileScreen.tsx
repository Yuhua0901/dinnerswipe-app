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
  const { user, logout } = useAuth();
  const [profileData, setProfileData] = useState<any>(null);
  const [persona, setPersona] = useState<PersonaData>({ emoji: '🍜', title: '深夜療癒食客', desc: '疲憊的夜晚，一碗熱湯就是最好的擁抱' });
  const [soulmateCount, setSoulmateCount] = useState(0);

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

  return (
    <div className="screen active" style={{ display: 'flex' }}>
      <div className="profile-hero">
        <div className="av-ring">{user?.name ? user.name.charAt(0) : '😴'}</div>
        <div className="p-name">{user?.name || '使用者'}</div>
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
          <div className="sc-n">{profileData?.reputation || user?.reputation || 0}</div>
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
          {profileData?.zone_preference ? (
            Object.keys(profileData.zone_preference).map((zone, idx) => (
              <div key={zone} className={`pchip ${idx < 2 ? 'hot' : ''}`}>
                {idx === 0 ? '🔥 ' : ''}{zone}
              </div>
            ))
          ) : (
            <>
              <div className="pchip hot">🔥 台南市東區</div>
              <div className="pchip">中西區</div>
            </>
          )}
        </div>
      </div>

      <div className="hist-sec">
        <div className="hist-t">近期決定紀錄</div>
        {/* Placeholder data for history */}
        <div className="hist-row">
          <div className="he">🍜</div>
          <div className="hi">
            <div className="hn">老字號雞湯麵</div>
            <div className="ht">昨天</div>
          </div>
          <div className="hlabel m">符合心情</div>
        </div>
        <div className="hist-row">
          <div className="he">🍲</div>
          <div className="hi">
            <div className="hn">麻辣鴛鴦鍋</div>
            <div className="ht">3天前</div>
          </div>
          <div className="hlabel h">療癒十足</div>
        </div>
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

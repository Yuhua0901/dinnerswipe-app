import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/client';

const FOOD_EMOJIS: Record<string, string> = {
  '魯肉飯': '🍚', '雞肉飯': '🍚', '爌肉飯': '🍚', '燒肉飯': '🍱', '排骨飯': '🍱', '肉燥飯': '🍚', '飯糰': '🍙', 
  '炒飯': '🍚', '燴飯': '🍛', '飯': '🍚', '牛肉麵': '🍜', '擔仔麵': '🍜', '拉麵': '🍜', '意麵': '🍜', '乾麵': '🍜', '涼麵': '🍜', 
  '烏龍麵': '🍜', '麵線': '🍜', '米粉': '🍜', '冬粉': '🍜', '河粉': '🍜', '義大利麵': '🍝', '麵': '🍜',
  '漢堡': '🍔', '披薩': '🍕', '牛排': '🥩', '火鍋': '🍲', '壽喜燒': '🍲', '羊肉爐': '🍲', '薑母鴨': '🍲',
  '生魚片': '🍣', '壽司': '🍣', '手卷': '🌯', '便當': '🍱', '餐盒': '🍱', '咖哩': '🍛', 
  '炸雞': '🍗', '香雞排': '🍗', '鹽酥雞': '🍗', '薯條': '🍟', 
  '蛋餅': '🌯', '水餃': '🥟', '鍋貼': '🥟', '煎餃': '🥟', '湯包': '🥟', '燒賣': '🥟', '包子': '🥟',
  '沙拉': '🥗', '三明治': '🥪', '吐司': '🍞', '麵包': '🥖', '可頌': '🥐', '熱狗': '🌭',
  '臭豆腐': '🥘', '滷味': '🥘', '鴨血': '🥘', '豆腐': '🥘', '大腸包小腸': '🌭', 
  '蚵仔煎': '🥞', '蔥抓餅': '🥞', '蔥油餅': '🥞', '煎餅': '🥞', '大阪燒': '🥞', '鬆餅': '🥞', 
  '肉圓': '🧆', '碗粿': '🧆', '肉': '🍖', '烤肉': '🍢', '串燒': '🍢',
  '濃湯': '🥣', '雞湯': '🥣', '湯': '🥣', '粥': '🥣', '鍋': '🍲', 
  '蛋糕': '🍰', '甜點': '🍮', '塔': '🍮', '冰淇淋': '🍦', '豆花': '🍨', '冰': '🍧', '湯圓': '🥣',
  '奶': '🧋', '咖啡': '☕', '飲料': '🥤', '茶': '🍵'
};

const getEmoji = (name: string) => {
  for (const [key, emoji] of Object.entries(FOOD_EMOJIS)) {
    if (name.includes(key)) return emoji;
  }
  return '🍽️';
};

interface WarmRecommendation {
  food_name: string;
  supporter_count: number;
  message: string;
}

interface SoulmateData {
  matched: boolean;
  match_count: number;
  best_match_rate: number;
  common_foods: string[];
  message: string;
}

interface StrangerData {
  user_id: number;
  name: string;
  mood: string;
  avatar?: string;
}

interface ReceivedRec {
  id: number;
  sender_name: string;
  food_name: string;
  message: string;
  status: string;
  created_at: string;
}

export const RecScreen: React.FC = () => {
  const [recommendation, setRecommendation] = useState<any>(null);
  const [warmRecs, setWarmRecs] = useState<WarmRecommendation[]>([]);
  const [soulmate, setSoulmate] = useState<SoulmateData | null>(null);
  const [strangers, setStrangers] = useState<StrangerData[]>([]);
  const [receivedRecs, setReceivedRecs] = useState<ReceivedRec[]>([]);
  
  const [showModal, setShowModal] = useState(false);
  const [targetUser, setTargetUser] = useState<StrangerData | null>(null);
  const [recFood, setRecFood] = useState('');
  const [recMsg, setRecMsg] = useState('');

  const [loading, setLoading] = useState(true);
  const [hasNoSwipes, setHasNoSwipes] = useState(false);
  const [timeLeftStr, setTimeLeftStr] = useState<string>('');

  useEffect(() => {
    fetchRecommendations();
    fetchWarmRecommendations();
    fetchSoulmate();
    fetchStrangers();
    fetchReceivedRecs();
  }, []);

  useEffect(() => {
    const updateCountdown = () => {
      const cached = localStorage.getItem('dinner_rec_cache');
      if (cached) {
        const { timestamp } = JSON.parse(cached);
        const elapsed = Date.now() - timestamp;
        const limit = 2 * 60 * 60 * 1000; // 2 小時
        const remaining = limit - elapsed;
        
        if (remaining > 0) {
          const totalSeconds = Math.floor(remaining / 1000);
          const hours = Math.floor(totalSeconds / 3600);
          const minutes = Math.floor((totalSeconds % 3600) / 60);
          const seconds = totalSeconds % 60;
          
          if (hours > 0) {
            setTimeLeftStr(`${hours} 小時 ${minutes} 分`);
          } else {
            setTimeLeftStr(`${minutes} 分 ${seconds} 秒`);
          }
        } else {
          setTimeLeftStr('');
          // 快取過期，重新載入
          fetchRecommendations(true);
        }
      } else {
        setTimeLeftStr('');
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [recommendation]);

  const fetchRecommendations = async (forceRefresh = false) => {
    setLoading(true);
    setHasNoSwipes(false);
    try {
      // 1. 檢查 2 小時快取
      if (!forceRefresh) {
        const cached = localStorage.getItem('dinner_rec_cache');
        if (cached) {
          const { food, timestamp } = JSON.parse(cached);
          const twoHours = 2 * 60 * 60 * 1000;
          if (Date.now() - timestamp < twoHours) {
            setRecommendation(food);
            setLoading(false);
            return;
          }
        }
      }

      // 2. 否則向後端請求
      const savedTagsStr = localStorage.getItem('today_mood_tags');
      const moodTags = savedTagsStr ? JSON.parse(savedTagsStr) : ['一個人'];
      
      const res = await apiClient.post('/api/v1/recommend', {
        food_names: [], // 讓後端自動尋找
        mood_tags: moodTags,
        emotion_map: {}
      });
      
      const topFood = res.data.top1 || res.data.recommendations[0];
      if (topFood) {
        setRecommendation(topFood);
        localStorage.setItem('dinner_rec_cache', JSON.stringify({
          food: topFood,
          timestamp: Date.now()
        }));
      } else {
        setRecommendation(null);
        setHasNoSwipes(true);
      }
    } catch (e) {
      console.error(e);
      // Fallback
      setRecommendation({
        food_name: '老字號雞湯麵',
        final_score: 92.5,
        personal_score: 85,
        community_score: 95,
        context_score: 80,
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchWarmRecommendations = async () => {
    try {
      const savedTagsStr = localStorage.getItem('today_mood_tags');
      const moodTags = savedTagsStr ? JSON.parse(savedTagsStr) : ['一個人'];
      const currentMood = moodTags[0] || '一個人';

      const res = await apiClient.get('/api/v1/warm-recommendations', {
        params: { mood: currentMood }
      });
      setWarmRecs(res.data.recommendations || []);
    } catch (e) {
      console.error(e);
      setWarmRecs([
        { food_name: '老字號雞湯麵', supporter_count: 12, message: '12 位路人在心情低落時選擇了一碗暖心雞湯麵 🫂' },
      ]);
    }
  };

  const fetchSoulmate = async () => {
    try {
      const res = await apiClient.get('/api/v1/soulmate');
      setSoulmate(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchStrangers = async () => {
    try {
      const res = await apiClient.get('/api/v1/users/moods');
      setStrangers(res.data);
    } catch (e) {
      console.error(e);
      setStrangers([
        { user_id: 999, name: '小明', mood: '剛加完班' },
        { user_id: 998, name: '阿華', mood: '很沮喪' },
        { user_id: 997, name: 'Ken', mood: '疲憊求療癒' }
      ]);
    }
  };

  const fetchReceivedRecs = async () => {
    try {
      const res = await apiClient.get('/api/v1/recommendations/received');
      setReceivedRecs(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleOpenModal = (user: StrangerData) => {
    setTargetUser(user);
    setRecFood('');
    setRecMsg('');
    setShowModal(true);
  };

  const handleSendRecommendation = async () => {
    if (!targetUser || !recFood.trim()) return;
    try {
      await apiClient.post('/api/v1/recommendations/send', {
        receiver_id: targetUser.user_id,
        food_name: recFood.trim(),
        message: recMsg.trim()
      });
      setShowModal(false);
      
      const toast = document.getElementById('toast');
      if (toast) {
        toast.innerText = `已成功將 ${recFood} 推薦給 ${targetUser.name}！`;
        toast.className = 'show';
        setTimeout(() => { toast.className = toast.className.replace('show', ''); }, 3000);
      }
    } catch(e) {
      console.error(e);
      alert('發送失敗');
    }
  };

  const handleAcceptRec = async (recId: number) => {
    try {
      await apiClient.post(`/api/v1/recommendations/${recId}/accept`);
      // 更新本地狀態
      setReceivedRecs(prev => 
        prev.map(r => r.id === recId ? { ...r, status: 'accepted' } : r)
      );
      const toast = document.getElementById('toast');
      if (toast) {
        toast.innerText = `已接受推薦並送出聲望給對方！ ❤️`;
        toast.className = 'show';
        setTimeout(() => { toast.className = toast.className.replace('show', ''); }, 3000);
      }
    } catch(e) {
      console.error(e);
      alert('接受推薦失敗或已經接受過');
    }
  };

  if (loading) {
    return (
      <div className="screen active" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '24px', marginBottom: '12px' }}>🔄</div>
          <div style={{ color: 'var(--text-s)', fontSize: '14px' }}>正在計算您的專屬晚餐推薦...</div>
        </div>
      </div>
    );
  }

  if (hasNoSwipes) {
    return (
      <div className="screen active" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🍽️</div>
        <h3 style={{ fontFamily: 'Noto Serif TC, serif', color: 'var(--brown)', marginBottom: '12px' }}>您目前還沒有候選晚餐喔！</h3>
        <p style={{ color: 'var(--text-h)', fontSize: '14px', lineHeight: '1.6', maxWidth: '280px', marginBottom: '24px' }}>
          推薦系統會依據您最近一次刷卡或歷史上喜歡（右滑/愛心）的卡片來進行加權計算。請先去首頁挑選幾款想吃的晚餐吧 💖
        </p>
        <button 
          className="rbtn pr" 
          onClick={() => {
            const homeBtn = document.querySelector('.bottom-nav .nav-item') as HTMLElement;
            if (homeBtn) {
              homeBtn.click();
            }
          }}
          style={{ width: 'auto', padding: '12px 24px' }}
        >
          立即前往刷卡
        </button>
      </div>
    );
  }

  return (
    <div className="screen active" style={{ display: 'flex' }}>
      
      {/* ══ 路人動態牆 ══ */}
      {strangers.length > 0 && (
        <div className="discover-sec">
          <div className="discover-t">看看其他人的心情...</div>
          <div className="discover-scroll">
            {strangers.map(s => (
              <div key={s.user_id} className="stranger-card" onClick={() => handleOpenModal(s)}>
                <div className="stranger-av" style={{ overflow: 'hidden', padding: s.avatar ? 0 : undefined }}>
                  {s.avatar ? <img src={s.avatar} alt="av" style={{width:'100%', height:'100%', objectFit:'cover'}} /> : '👤'}
                  <div className="mood-badge">{s.mood.includes('班') ? '💼' : s.mood.includes('喪') ? '🌧️' : '💭'}</div>
                </div>
                <div className="stranger-n">{s.name}</div>
                <div className="stranger-m">{s.mood}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rec-hero">
        <div className="rec-pre">今晚最適合你的選擇</div>
        <div className="rec-e">{getEmoji(recommendation.food_name)}</div>
        <div className="rec-name">{recommendation.food_name}</div>
        {timeLeftStr ? (
          <div className="rec-badge" style={{ background: '#EAE5D9', color: 'var(--text-s)', padding: '6px 14px', borderRadius: '20px' }}>
            ⏱️ 推薦已鎖定 (將於 {timeLeftStr} 後重新計算)
          </div>
        ) : (
          <div className="rec-badge">你的喜好 ✕ 附近 84 人熱選</div>
        )}
      </div>

      <div className="score-sec">
        <div className="score-t">推薦分數來源 (總分: {recommendation.final_score?.toFixed(1)})</div>
        <div className="sr">
          <div className="ss">個人意願</div>
          <div className="sb-w">
            <div className="sb" style={{ width: `${recommendation.personal_score || 60}%`, background: 'var(--amber)' }}></div>
          </div>
          <div className="sp">60%</div>
        </div>
        <div className="sr">
          <div className="ss">區域熱度</div>
          <div className="sb-w">
            <div className="sb" style={{ width: `${recommendation.community_score || 25}%`, background: 'var(--coral)' }}></div>
          </div>
          <div className="sp">25%</div>
        </div>
        <div className="sr">
          <div className="ss">情境標籤</div>
          <div className="sb-w">
            <div className="sb" style={{ width: `${recommendation.context_score || 15}%`, background: 'var(--brown-m)' }}></div>
          </div>
          <div className="sp">15%</div>
        </div>
      </div>

      {soulmate && (
        <div className="match-banner">
          <div className="mb-icon">{soulmate.matched ? '👫' : '🔍'}</div>
          <div className="mb-t">
            <div className="mb-h">
              {soulmate.matched ? '晚餐靈魂伴侶出現了！' : '尋找靈魂伴侶中...'}
            </div>
            <div className="mb-s">{soulmate.message}</div>
            {soulmate.matched && soulmate.common_foods.length > 0 && (
              <div className="mb-foods">
                {soulmate.common_foods.map((f) => (
                  <span key={f} className="cfood">{f}</span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 專屬與路人推薦區 */}
      <div className="warm-rec-sec">
        <div className="warm-rec-title">🫂 溫暖推薦</div>
        <div className="warm-rec-subtitle">來自社群的關心與推薦</div>
        
        {/* 真人專屬推薦 (Received Cards) */}
        {receivedRecs.map(r => (
          <div key={r.id} className="received-card">
            <div className="rc-header">
              <span className="rc-sender">{r.sender_name}</span>
              <span className="rc-time">剛剛特地推薦給你</span>
            </div>
            <div className="rc-food">{r.food_name}</div>
            {r.message && <div className="rc-msg">"{r.message}"</div>}
            
            {r.status === 'pending' ? (
              <button 
                className="rbtn pr" 
                style={{ marginTop: '10px', fontSize: '14px', padding: '8px 12px', width: '100%', background: 'var(--coral)', color: '#fff' }}
                onClick={() => handleAcceptRec(r.id)}
              >
                接受推薦並感謝對方 ❤️
              </button>
            ) : (
              <div style={{ marginTop: '10px', fontSize: '13px', color: 'var(--coral)', fontWeight: 'bold', textAlign: 'center', background: 'rgba(255, 126, 103, 0.1)', padding: '6px', borderRadius: '8px' }}>
                已接受這個溫暖推薦 ❤️
              </div>
            )}
          </div>
        ))}

        {/* 系統統計的溫暖推薦 */}
        <div className="warm-rec-list">
          {warmRecs.map((rec) => (
            <div key={rec.food_name} className="warm-rec-card">
              <div className="warm-rec-food">{rec.food_name}</div>
              <div className="warm-rec-msg">{rec.message}</div>
              <div className="warm-rec-count">
                ❤️ {rec.supporter_count} 人推薦
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rec-acts">
        <button
          className="rbtn pr"
          onClick={() => {
            const query = encodeURIComponent(recommendation.food_name);
            window.open(`https://www.google.com/maps/search/${query}`, '_blank');
          }}
        >
          今晚就吃這個！
        </button>
        <button className="rbtn se">繼續刷卡</button>
      </div>

      {/* Modal Overlay */}
      {showModal && targetUser && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="modal-content">
            <div className="modal-title">發送溫暖推薦</div>
            <div className="modal-sub">給正在「{targetUser.mood}」的 {targetUser.name}</div>
            
            <input 
              className="modal-input" 
              placeholder="推薦吃什麼？ (例如: 熱甜湯)" 
              value={recFood} 
              onChange={e => setRecFood(e.target.value)} 
              autoFocus
            />
            <input 
              className="modal-input" 
              placeholder="留句溫暖的話給他吧..." 
              value={recMsg} 
              onChange={e => setRecMsg(e.target.value)} 
            />
            
            <div className="modal-actions">
              <button className="modal-btn cancel" onClick={() => setShowModal(false)}>取消</button>
              <button className="modal-btn send" onClick={handleSendRecommendation}>送出卡片</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

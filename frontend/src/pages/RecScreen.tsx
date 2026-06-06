import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/client';

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
}

interface ReceivedRec {
  id: number;
  sender_name: string;
  food_name: string;
  message: string;
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

  useEffect(() => {
    fetchRecommendations();
    fetchWarmRecommendations();
    fetchSoulmate();
    fetchStrangers();
    fetchReceivedRecs();
  }, []);

  const fetchRecommendations = async () => {
    try {
      const mockSwipedFoods = ['老字號雞湯麵', '炙燒鮭魚握壽司', '經典美式起司漢堡'];
      const res = await apiClient.post('/api/v1/recommend', {
        food_names: mockSwipedFoods,
        mood_tags: ['的一個人'],
        emotion_map: {}
      });
      setRecommendation(res.data.top1 || res.data.recommendations[0]);
    } catch (e) {
      console.error(e);
      setRecommendation({
        food_name: '老字號雞湯麵',
        final_score: 92.5,
        personal_score: 85,
        community_score: 95,
        context_score: 80,
      });
    }
  };

  const fetchWarmRecommendations = async () => {
    try {
      const res = await apiClient.get('/api/v1/warm-recommendations', {
        params: { mood: '疲憊求療癒' }
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

  if (!recommendation) {
    return <div className="screen active" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>計算推薦中...</div>;
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
                <div className="stranger-av">
                  👤
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
        <div className="rec-e">🍜</div>
        <div className="rec-name">{recommendation.food_name}</div>
        <div className="rec-badge">你的喜好 ✕ 附近 84 人熱選</div>
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

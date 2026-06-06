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

export const RecScreen: React.FC = () => {
  const [recommendation, setRecommendation] = useState<any>(null);
  const [warmRecs, setWarmRecs] = useState<WarmRecommendation[]>([]);
  const [soulmate, setSoulmate] = useState<SoulmateData | null>(null);

  useEffect(() => {
    fetchRecommendations();
    fetchWarmRecommendations();
    fetchSoulmate();
  }, []);

  const fetchRecommendations = async () => {
    try {
      // In a real flow, the last session data (swiped foods) would be passed here
      // For now, we simulate fetching recommendation
      const mockSwipedFoods = ['老字號雞湯麵', '炙燒鮭魚握壽司', '經典美式起司漢堡'];
      const res = await apiClient.post('/api/v1/recommend', {
        food_names: mockSwipedFoods,
        mood_tags: ['的一個人'],
        emotion_map: {}
      });
      setRecommendation(res.data.top1 || res.data.recommendations[0]);
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
    }
  };

  /**
   * 功能2：取得路人溫暖推薦
   */
  const fetchWarmRecommendations = async () => {
    try {
      const res = await apiClient.get('/api/v1/warm-recommendations', {
        params: { mood: '疲憊求療癒' }
      });
      setWarmRecs(res.data.recommendations || []);
    } catch (e) {
      console.error(e);
      // fallback 預設資料
      setWarmRecs([
        { food_name: '老字號雞湯麵', supporter_count: 12, message: '12 位路人在心情低落時選擇了一碗暖心雞湯麵 🫂' },
        { food_name: '紅豆湯圓', supporter_count: 8, message: '8 位路人推薦甜甜的紅豆湯圓療癒你的心 🫂' },
        { food_name: '薑母鴨暖鍋', supporter_count: 6, message: '6 位路人推薦用薑母鴨溫暖這個夜晚 🫂' },
      ]);
    }
  };

  /**
   * 功能4：取得今晚的靈魂伴侶匹配資料
   */
  const fetchSoulmate = async () => {
    try {
      const res = await apiClient.get('/api/v1/soulmate');
      setSoulmate(res.data);
    } catch (e) {
      console.error(e);
      // fallback
      setSoulmate({
        matched: true,
        match_count: 1,
        best_match_rate: 100,
        common_foods: ['老字號雞湯麵'],
        message: '有 1 位路人與你的晚餐頻率 100% 契合',
      });
    }
  };

  if (!recommendation) {
    return <div className="screen active" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>計算推薦中...</div>;
  }

  return (
    <div className="screen active" style={{ display: 'flex' }}>
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

      <div className="contrib-sec">
        <div className="contrib-t">你對各料理區域的貢獻度</div>
        <div className="contrib-grid">
          <div className="contrib-row">
            <div className="contrib-header">
              <div className="contrib-zone">台南市東區</div>
              <div className="contrib-pct">45%</div>
            </div>
            <div className="contrib-bar-wrap">
              <div className="contrib-bar" style={{ width: '45%', background: 'var(--amber)' }}></div>
            </div>
            <div className="contrib-foods">
              <span className="cfood">老字號雞湯麵</span>
              <span className="cfood">麻辣鴨血臭豆腐</span>
            </div>
          </div>
        </div>
      </div>

      {/* NOTE: 功能4 - 靈魂伴侶匹配（動態資料驅動） */}
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

      {/* NOTE: 功能2 - 路人溫暖推薦 */}
      {warmRecs.length > 0 && (
        <div className="warm-rec-sec">
          <div className="warm-rec-title">🫂 路人溫暖推薦</div>
          <div className="warm-rec-subtitle">其他人在相似心情時最愛的選擇</div>
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
      )}

      <div className="rec-acts">
        <button
          className="rbtn pr"
          onClick={() => {
            // NOTE: 使用 Google Maps 搜尋 URL，讓用戶能直接查看餐廳位置與評價
            const query = encodeURIComponent(recommendation.food_name);
            window.open(`https://www.google.com/maps/search/${query}`, '_blank');
          }}
        >
          今晚就吃這個！
        </button>
        <button className="rbtn se">繼續刷卡</button>
      </div>
    </div>
  );
};

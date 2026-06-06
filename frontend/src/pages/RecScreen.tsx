import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/client';

export const RecScreen: React.FC = () => {
  const [recommendation, setRecommendation] = useState<any>(null);

  useEffect(() => {
    fetchRecommendations();
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

      <div className="match-banner">
        <div className="mb-icon">👫</div>
        <div className="mb-t">
          <div className="mb-h">晚餐靈魂伴侶出現了！</div>
          <div className="mb-s">附近 1 位路人今晚選擇 100% 吻合</div>
        </div>
      </div>

      <div className="rec-acts">
        <button className="rbtn pr">今晚就吃這個！</button>
        <button className="rbtn se">繼續刷卡</button>
      </div>
    </div>
  );
};

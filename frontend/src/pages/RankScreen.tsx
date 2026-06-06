import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/client';

// NOTE: 各分頁的備用資料，後端 API 不可用時顯示有意義的差異化內容
const FALLBACK_DATA: Record<string, any[]> = {
  overall: [
    { rank: 1, food_name: '老字號雞湯麵',   score: 98.5, heart_rate: 85, total_right: 320 },
    { rank: 2, food_name: '炙燒鮭魚握壽司', score: 95.2, heart_rate: 80, total_right: 275 },
    { rank: 3, food_name: '麻辣鴨血臭豆腐', score: 92.0, heart_rate: 75, total_right: 241 },
    { rank: 4, food_name: '經典美式起司漢堡', score: 88.3, heart_rate: 70, total_right: 198 },
    { rank: 5, food_name: '台式滷肉飯',      score: 85.1, heart_rate: 65, total_right: 176 },
  ],
  personal: [
    { rank: 1, food_name: '炙燒鮭魚握壽司', score: 97.0, heart_rate: 92, total_right: 148 },
    { rank: 2, food_name: '老字號雞湯麵',   score: 93.4, heart_rate: 87, total_right: 132 },
    { rank: 3, food_name: '抹茶牛奶冰',     score: 89.6, heart_rate: 78, total_right: 115 },
    { rank: 4, food_name: '韓式辣炒年糕',   score: 84.2, heart_rate: 71, total_right: 98 },
    { rank: 5, food_name: '越式牛肉河粉',   score: 80.5, heart_rate: 66, total_right: 87 },
  ],
  heal: [
    { rank: 1, food_name: '老字號雞湯麵',   score: 99.1, heart_rate: 91, total_right: 210 },
    { rank: 2, food_name: '薑母鴨暖鍋',     score: 94.8, heart_rate: 85, total_right: 183 },
    { rank: 3, food_name: '紅豆湯圓',       score: 91.3, heart_rate: 80, total_right: 162 },
    { rank: 4, food_name: '地瓜稀飯',       score: 86.7, heart_rate: 73, total_right: 140 },
    { rank: 5, food_name: '熱可可鬆餅',     score: 82.0, heart_rate: 68, total_right: 118 },
  ],
  group: [
    { rank: 1, food_name: '麻辣鴨血臭豆腐', score: 96.4, heart_rate: 88, total_right: 260 },
    { rank: 2, food_name: '韓式烤肉拼盤',   score: 93.7, heart_rate: 84, total_right: 238 },
    { rank: 3, food_name: '四川麻辣火鍋',   score: 90.2, heart_rate: 79, total_right: 215 },
    { rank: 4, food_name: '日式壽喜燒',     score: 87.5, heart_rate: 74, total_right: 192 },
    { rank: 5, food_name: '台式薑母鴨',     score: 83.1, heart_rate: 69, total_right: 170 },
  ],
  solo: [
    { rank: 1, food_name: '台式滷肉飯',      score: 95.8, heart_rate: 89, total_right: 145 },
    { rank: 2, food_name: '炙燒鮭魚丼',     score: 92.3, heart_rate: 83, total_right: 128 },
    { rank: 3, food_name: '越式牛肉河粉',   score: 88.6, heart_rate: 76, total_right: 112 },
    { rank: 4, food_name: '親子丼',         score: 84.9, heart_rate: 70, total_right: 97 },
    { rank: 5, food_name: '泡菜豆腐鍋',     score: 80.2, heart_rate: 64, total_right: 83 },
  ],
  healthy: [
    { rank: 1, food_name: '藜麥蔬食沙拉',   score: 94.5, heart_rate: 86, total_right: 135 },
    { rank: 2, food_name: '地中海烤雞胸',   score: 91.0, heart_rate: 81, total_right: 118 },
    { rank: 3, food_name: '酪梨鮪魚飯糰',   score: 87.4, heart_rate: 75, total_right: 103 },
    { rank: 4, food_name: '豆漿燕麥粥',     score: 83.8, heart_rate: 69, total_right: 89 },
    { rank: 5, food_name: '蒸蛋佐糙米飯',   score: 79.1, heart_rate: 62, total_right: 74 },
  ],
};

export const RankScreen: React.FC = () => {
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [currentTab, setCurrentTab] = useState('overall');

  useEffect(() => {
    fetchLeaderboard();
  }, [currentTab]);

  const fetchLeaderboard = async () => {
    try {
      const res = await apiClient.get('/api/v1/leaderboard', {
        params: { category: currentTab }
      });
      setLeaderboard(res.data.leaderboard);
    } catch (e) {
      console.error(e);
      setLeaderboard(FALLBACK_DATA[currentTab] ?? FALLBACK_DATA.overall);
    }
  };

  const getRankNumClass = (rank: number) => {
    if (rank === 1) return 'rank-num r1';
    if (rank === 2) return 'rank-num r2';
    if (rank === 3) return 'rank-num r3';
    return 'rank-num';
  };

  const tabs = [
    { id: 'overall', label: '綜合排名' },
    { id: 'personal', label: '我的喜好' },
    { id: 'heal', label: '療癒系' },
    { id: 'group', label: '揪人首選' },
    { id: 'solo', label: '一人食' },
    { id: 'healthy', label: '健康輕食' }
  ];

  return (
    <div className="screen active" style={{ display: 'flex' }}>
      <div className="s-header">
        <div className="s-title">晚餐熱度排行</div>
        <div className="s-sub">台南市 東區 · 即時更新</div>
      </div>
      
      <div className="rank-tabs">
        {tabs.map(tab => (
          <button 
            key={tab.id}
            className={`rtab ${currentTab === tab.id ? 'on' : ''}`}
            onClick={() => setCurrentTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="rank-list">
        {leaderboard.map(item => (
          <div key={item.food_name} className="rank-card">
            <div className={getRankNumClass(item.rank)}>{item.rank}</div>
            <div className="re">🍜</div>
            <div className="ri">
              <div className="rn">{item.food_name}</div>
              <div className="rt">
                <span className="rtag">🔥熱度 {item.score?.toFixed(1)}</span>
                <span className="rtag">❤️ {item.heart_rate?.toFixed(0)}% 必吃</span>
              </div>
              <div className="rb-wrap">
                <div className="rb" style={{ width: `${Math.min(100, item.heart_rate || 50)}%` }}></div>
              </div>
              <div className="rcount">{item.total_right} 人想吃</div>
            </div>
            <div className="rtrend">
              {item.rank <= 3 ? '🔥' : '📈'}
            </div>
          </div>
        ))}
      </div>
      <div style={{ height: '20px', flexShrink: 0 }}></div>
    </div>
  );
};

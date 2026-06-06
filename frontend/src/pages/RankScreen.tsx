import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/client';

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
      // Fallback dummy data for visual display if backend isn't ready
      setLeaderboard([
        { rank: 1, food_name: '老字號雞湯麵', score: 98.5, heart_rate: 85, total_right: 120, total_left: 10 },
        { rank: 2, food_name: '炙燒鮭魚握壽司', score: 95.2, heart_rate: 80, total_right: 110, total_left: 15 },
        { rank: 3, food_name: '麻辣鴨血臭豆腐', score: 92.0, heart_rate: 75, total_right: 95, total_left: 20 },
      ]);
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

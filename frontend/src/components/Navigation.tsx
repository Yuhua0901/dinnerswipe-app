import React from 'react';

interface TopbarProps {
  swipeCount: number;
  onGoRec: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({ swipeCount, onGoRec }) => {
  return (
    <div className="topbar">
      <div className="logo">Dinner<span>Swipe</span></div>
      <div className="topbar-right">
        <div className="swipe-counter">已滑 <span>{swipeCount}</span>/15</div>
        <div className="topbar-icon" onClick={onGoRec}>✨</div>
      </div>
    </div>
  );
};

interface BottomNavProps {
  currentTab: string;
  onChangeTab: (tab: string) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentTab, onChangeTab }) => {
  const tabs = [
    { id: 'swipe', icon: '🃏', label: '刷卡' },
    { id: 'rank', icon: '🏆', label: '熱度榜' },
    { id: 'rec', icon: '✨', label: '推薦' },
    { id: 'profile', icon: '🌙', label: '我的' },
  ];

  return (
    <div className="bottom-nav">
      {tabs.map(tab => (
        <div 
          key={tab.id} 
          className={`nav-item ${currentTab === tab.id ? 'active' : ''}`}
          onClick={() => onChangeTab(tab.id)}
        >
          <span className="ni">{tab.icon}</span>
          {tab.label}
        </div>
      ))}
    </div>
  );
};

import React, { useState } from 'react';

interface TutorialProps {
  onComplete: () => void;
}

export const Tutorial: React.FC<TutorialProps> = ({ onComplete }) => {
  const [step, setStep] = useState(0);

  const steps = [
    {
      icon: '👋',
      title: '歡迎來到 DinnerSwipe！',
      desc: '滑 15 張卡片，讓附近的人幫你解決「今晚吃什麼」的難題，並給出你的專屬推薦。',
      demo: (
        <div className="tut-demo">
          <div className="tut-demo-item"><span style={{fontSize: '32px'}}>🃏</span><span>滑15張</span></div>
          <div style={{fontSize: '20px', color: 'var(--text-h)'}}>→</div>
          <div className="tut-demo-item"><span style={{fontSize: '32px'}}>✨</span><span>專屬推薦</span></div>
        </div>
      )
    },
    {
      icon: '👆',
      title: '左右滑動卡片',
      desc: '直接拖曳卡片，或使用下方按鈕快速決定。',
      demo: (
        <div className="tut-demo">
          <div className="tut-demo-item"><span>←</span><span style={{color: 'var(--red)'}}>✕ 不要</span></div>
          <div className="tut-demo-item"><span style={{fontSize: '28px'}}>🍜</span><span>卡片</span></div>
          <div className="tut-demo-item"><span>→</span><span style={{color: 'var(--amber-d)'}}>想吃 ✓</span></div>
        </div>
      )
    },
    {
      icon: '♡',
      title: '愛心 = 強烈想吃',
      desc: '按下愛心，把這道菜加入「今晚必吃清單」，推薦演算法會特別加權這個偏好。',
      demo: (
        <div className="tut-demo">
          <div className="tut-demo-item"><span style={{fontSize: '32px', color: 'var(--coral)'}}>♡</span><span style={{color: 'var(--coral)'}}>必吃清單</span></div>
        </div>
      )
    },
    {
      icon: '🔥',
      title: '情緒標籤',
      desc: '卡片下方有六個情緒標籤，點選最貼近你感受的——這是推薦最重要的信號！',
      demo: (
        <div className="tut-demo" style={{flexWrap: 'wrap', gap: '8px', justifyContent: 'center'}}>
          <span>🔥渴望</span><span>🫂療癒</span><span>💭懷念</span>
          <span>👀好奇</span><span>👫揪人</span><span>📅改天</span>
        </div>
      )
    },
    {
      icon: '✨',
      title: '滑完 15 張看推薦',
      desc: '系統整合你的喜好（60%）＋區域熱度（25%）＋情境標籤（15%），給出今晚最適合的前 10 名推薦，並告訴你對各料理區域的貢獻。',
      demo: (
        <div className="tut-demo">
          <div className="tut-demo-item"><span style={{fontSize: '28px'}}>👤</span><span>你的意願</span></div>
          <div style={{fontSize: '16px'}}>＋</div>
          <div className="tut-demo-item"><span style={{fontSize: '28px'}}>🏙️</span><span>區域熱度</span></div>
          <div style={{fontSize: '16px'}}>=</div>
          <div className="tut-demo-item"><span style={{fontSize: '28px'}}>🎯</span><span>Top 10！</span></div>
        </div>
      )
    }
  ];

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      onComplete();
    }
  };

  return (
    <div id="tutorial">
      <div className="tut-card">
        <div className="tut-dots">
          {steps.map((_, idx) => (
            <div key={idx} className={`tut-dot ${idx === step ? 'on' : ''}`}></div>
          ))}
        </div>
        
        <div className="tut-step active">
          <div className="tut-icon">{steps[step].icon}</div>
          <div className="tut-title">{steps[step].title}</div>
          <div className="tut-desc">{steps[step].desc}</div>
          {steps[step].demo}
        </div>
        
        <div className="tut-btns">
          <button className="tut-btn skip" onClick={onComplete}>跳過</button>
          <button className="tut-btn next" onClick={handleNext}>
            {step === steps.length - 1 ? '開始吧！' : '下一步'}
          </button>
        </div>
      </div>
    </div>
  );
};

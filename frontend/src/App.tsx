import { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { AuthPage } from './pages/AuthPage';
import { Tutorial } from './components/Tutorial';
import { Topbar, BottomNav } from './components/Navigation';
import { SwipeScreen } from './pages/SwipeScreen';
import { RankScreen } from './pages/RankScreen';
import { ProfileScreen } from './pages/ProfileScreen';
import { RecScreen } from './pages/RecScreen';

function App() {
  const { user, isLoading, fetchUser } = useAuth();
  const [showTutorial, setShowTutorial] = useState(false);
  const [currentTab, setCurrentTab] = useState('swipe'); // swipe | rank | rec | profile
  const [swipeCount, setSwipeCount] = useState(0);
  const [toastMsg, setToastMsg] = useState('');

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  useEffect(() => {
    // 檢查是否是第一次使用
    const tutorialDone = localStorage.getItem('dinnerswipe_tutorial_done');
    if (user && !tutorialDone) {
      setShowTutorial(true);
    }

    // NOTE: GPS 獲取與更新地區邏輯
    if (user && !sessionStorage.getItem('gps_checked')) {
      sessionStorage.setItem('gps_checked', 'true');
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(async (position) => {
          const { latitude, longitude } = position.coords;
          try {
            const { apiClient } = await import('./api/client');
            const res = await apiClient.put('/api/v1/user/location', { lat: latitude, lng: longitude });
            if (res.data && res.data.ok) {
              fetchUser();
              setToastMsg(`已根據 GPS 更新您的所在區域：${res.data.region}`);
              setTimeout(() => setToastMsg(''), 4000);
            }
          } catch (e) {
            console.error('Update location failed', e);
          }
        }, (error) => {
          console.warn('GPS location access denied or failed:', error);
        });
      }
    }
  }, [user]);

  if (isLoading) {
    return <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>載入中...</div>;
  }

  if (!user) {
    return <AuthPage onSuccess={() => {}} />;
  }

  const handleTutorialComplete = () => {
    localStorage.setItem('dinnerswipe_tutorial_done', 'true');
    setShowTutorial(false);
  };

  const renderScreen = () => {
    return (
      <>
        <SwipeScreen 
          isHidden={currentTab !== 'swipe'}
          showToast={showToast}
          onSwipe={() => setSwipeCount(prev => Math.min(15, prev + 1))}
          onResetSwipeCount={() => setSwipeCount(0)}
        />
        {currentTab === 'rank' && <RankScreen />}
        {currentTab === 'rec' && <RecScreen />}
        {currentTab === 'profile' && <ProfileScreen currentSwipeCount={swipeCount} />}
      </>
    );
  };

  return (
    <>
      {showTutorial && <Tutorial onComplete={handleTutorialComplete} />}
      
      {!showTutorial && (
        <>
          <Topbar swipeCount={swipeCount} onGoRec={() => setCurrentTab('rec')} />
          {renderScreen()}
          <BottomNav currentTab={currentTab} onChangeTab={setCurrentTab} />
          
          <div id="toast" className={toastMsg ? 'show' : ''}>
            {toastMsg}
          </div>
        </>
      )}
    </>
  );
}

export default App;

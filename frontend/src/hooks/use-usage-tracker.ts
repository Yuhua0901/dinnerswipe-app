import { useEffect, useRef } from 'react';
import { apiClient } from '../api/client';

// NOTE: 心跳間隔 30 秒，與後端 90 秒超時搭配，容許最多 2 次心跳遺失
const HEARTBEAT_INTERVAL_MS = 30_000;

/**
 * 追蹤用戶使用時間的自定義 Hook
 * 登入後自動開始記錄，登出或離開頁面時自動結束
 *
 * 設計要點：
 * - 使用 ref 儲存所有可變狀態，避免 React Strict Mode 下 useCallback 閉包陷阱
 * - startTracking / endTracking 使用同步鎖 (isStartingRef) 防止 race condition
 * - sendBeacon 失敗時使用 fetch keepalive 作為 fallback
 *
 * @param isLoggedIn 用戶是否已登入
 */
export function useUsageTracker(isLoggedIn: boolean): void {
  const sessionIdRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // NOTE: 防止 startTracking 尚未完成時被重複呼叫
  const isStartingRef = useRef(false);

  /**
   * 停止心跳定時器
   */
  const stopHeartbeat = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  /**
   * 發送心跳回報
   */
  const sendHeartbeat = async () => {
    if (!sessionIdRef.current) return;
    try {
      await apiClient.post('/api/v1/usage/heartbeat', {
        session_id: sessionIdRef.current,
      });
    } catch (error) {
      // NOTE: 心跳失敗不影響用戶使用體驗，靜默處理
      console.warn('心跳回報失敗:', error);
    }
  };

  /**
   * 啟動心跳定時器
   */
  const startHeartbeat = () => {
    stopHeartbeat();
    intervalRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);
  };

  /**
   * 開始追蹤：呼叫 POST /usage/start 取得 session_id
   * 使用同步鎖避免在 React Strict Mode 或 visibilitychange 快速觸發時重複建立 Session
   */
  const startTracking = async () => {
    if (isStartingRef.current || sessionIdRef.current) return;
    isStartingRef.current = true;

    try {
      const res = await apiClient.post('/api/v1/usage/start', {
        page_context: 'app',
      });
      sessionIdRef.current = res.data.session_id;
      startHeartbeat();
    } catch (error) {
      console.error('使用時間追蹤啟動失敗:', error);
    } finally {
      isStartingRef.current = false;
    }
  };

  /**
   * 結束追蹤（同步版本），使用 sendBeacon / fetch keepalive 確保頁面關閉時也能送出
   */
  const endTracking = () => {
    stopHeartbeat();
    if (!sessionIdRef.current) return;

    const currentSessionId = sessionIdRef.current;
    sessionIdRef.current = null;

    try {
      const token = localStorage.getItem('dinnerswipe_token') || '';
      const payload = JSON.stringify({ session_id: currentSessionId });
      const baseUrl = import.meta.env.MODE === 'production' ? '' : 'http://localhost:8000';
      const url = `${baseUrl}/api/v1/usage/end?token=${token}`;

      const blob = new Blob([payload], { type: 'application/json' });
      const sent = navigator.sendBeacon(url, blob);

      // HACK: sendBeacon 不支援 Authorization header，若失敗則用 fetch keepalive fallback
      if (!sent) {
        fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
          keepalive: true,
        }).catch(() => {
          // NOTE: 頁面關閉時 fetch 失敗是預期行為，後端 _close_stale_sessions 會做善後
        });
      }
    } catch (error) {
      console.warn('結束使用追蹤失敗:', error);
    }
  };

  // NOTE: 登入狀態變化時啟動或停止追蹤
  useEffect(() => {
    if (isLoggedIn) {
      startTracking();
    } else {
      endTracking();
    }

    return () => {
      endTracking();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn]);

  // NOTE: 監聽頁面可見性變化和關閉事件
  useEffect(() => {
    if (!isLoggedIn) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        endTracking();
      } else if (document.visibilityState === 'visible') {
        // 重新進入頁面時開始新的 Session
        startTracking();
      }
    };

    const handleBeforeUnload = () => {
      endTracking();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn]);
}

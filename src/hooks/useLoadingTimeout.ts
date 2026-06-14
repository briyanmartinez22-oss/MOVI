import { useCallback, useEffect, useRef, useState } from 'react';

const DEFAULT_TIMEOUT_MS = 5000;

export function useLoadingTimeout(timeoutMs = DEFAULT_TIMEOUT_MS) {
  const [loading, setLoading] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startLoading = useCallback(() => {
    clearTimer();
    setTimedOut(false);
    setLoading(true);
    timerRef.current = setTimeout(() => {
      setLoading(false);
      setTimedOut(true);
    }, timeoutMs);
  }, [clearTimer, timeoutMs]);

  const stopLoading = useCallback(() => {
    clearTimer();
    setLoading(false);
    setTimedOut(false);
  }, [clearTimer]);

  const resetTimeout = useCallback(() => {
    clearTimer();
    setTimedOut(false);
  }, [clearTimer]);

  useEffect(() => () => clearTimer(), [clearTimer]);

  return {
    loading,
    timedOut,
    startLoading,
    stopLoading,
    resetTimeout,
    setLoading,
    setTimedOut,
  };
}

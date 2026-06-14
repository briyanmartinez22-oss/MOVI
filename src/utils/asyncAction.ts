import { useCallback, useRef } from 'react';
import { useLoadingTimeout } from '../hooks/useLoadingTimeout';

/**
 * Ejecuta una acción async con loading y timeout de seguridad (5s por defecto).
 */
export function useAsyncAction(timeoutMs = 5000) {
  const { loading, timedOut, startLoading, stopLoading, resetTimeout } = useLoadingTimeout(timeoutMs);
  const actionRef = useRef<(() => Promise<void>) | null>(null);

  const run = useCallback(
    async (action: () => Promise<void>) => {
      actionRef.current = action;
      startLoading();
      try {
        await action();
      } finally {
        stopLoading();
      }
    },
    [startLoading, stopLoading]
  );

  const retry = useCallback(() => {
    resetTimeout();
    if (actionRef.current) void run(actionRef.current);
  }, [resetTimeout, run]);

  return { loading, timedOut, run, retry, resetTimeout };
}

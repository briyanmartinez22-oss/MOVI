import { useCallback, useState } from 'react';
import { Keyboard } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { getRoleHomeRoute } from '../utils/platform';

export function useSafeBack() {
  const router = useRouter();
  const { user } = useAuth();
  const [showFallback, setShowFallback] = useState(false);

  const goHome = useCallback(() => {
    Keyboard.dismiss();
    const route = user ? getRoleHomeRoute(user.role) : '/';
    router.replace(route as never);
    setShowFallback(false);
  }, [router, user]);

  const handleBack = useCallback(() => {
    Keyboard.dismiss();
    if (router.canGoBack()) {
      router.back();
      setShowFallback(false);
    } else {
      setShowFallback(true);
    }
  }, [router]);

  const dismissFallback = useCallback(() => {
    setShowFallback(false);
  }, []);

  return { handleBack, showFallback, goHome, dismissFallback };
}

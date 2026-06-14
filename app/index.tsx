import { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { BrandedLoadingView } from '../src/components/BrandedLoadingView';
import { LoadingTimeoutBanner } from '../src/components/LoadingTimeoutBanner';
import { useAuth } from '../src/context/AuthContext';
import { getRoleHomeRoute } from '../src/utils/platform';

const BOOT_TIMEOUT_MS = 5000;

export default function BootstrapScreen() {
  const router = useRouter();
  const { user, isLoading, bootstrap, logout } = useAuth();
  const [bootTimedOut, setBootTimedOut] = useState(false);

  const handleBootRetry = () => {
    setBootTimedOut(false);
    if (user) {
      router.replace(getRoleHomeRoute(user.role) as never);
      return;
    }
    void bootstrap();
  };

  useEffect(() => {
    if (!isLoading && user) {
      router.replace(getRoleHomeRoute(user.role) as never);
    } else if (!isLoading && !user) {
      router.replace('/welcome');
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    if (!isLoading) {
      setBootTimedOut(false);
      return;
    }
    const timer = setTimeout(() => setBootTimedOut(true), BOOT_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [isLoading]);

  if (bootTimedOut && (isLoading || user)) {
    return (
      <View style={styles.loading}>
        <LoadingTimeoutBanner visible onRetry={handleBootRetry} />
      </View>
    );
  }

  return (
    <BrandedLoadingView
      onDemoReset={async () => {
        await logout();
        router.replace('/welcome');
      }}
    />
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
});

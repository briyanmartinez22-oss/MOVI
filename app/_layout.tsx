import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../src/context/AuthContext';
import { TripProvider } from '../src/context/TripContext';
import { AppShell } from '../src/components/AppShell';
import { BrandedLoadingView } from '../src/components/BrandedLoadingView';
import { PushNotificationManager } from '../src/components/PushNotificationManager';
import { useBrandFonts } from '../src/hooks/useBrandFonts';

function RootNavigator() {
  return (
    <AppShell>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="welcome" />
        <Stack.Screen name="legal" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="auth" />
        <Stack.Screen name="passenger" />
        <Stack.Screen name="driver" />
        <Stack.Screen name="owner" />
        <Stack.Screen name="business" />
        <Stack.Screen name="admin" />
        <Stack.Screen name="notifications" />
        <Stack.Screen name="activity" />
        <Stack.Screen name="chat" />
        <Stack.Screen name="learn" />
        {__DEV__ ? (
          <>
            <Stack.Screen name="dev/learning" />
            <Stack.Screen name="dev/qa" />
          </>
        ) : null}
      </Stack>
    </AppShell>
  );
}

export default function RootLayout() {
  const fontsLoaded = useBrandFonts();

  if (!fontsLoaded) {
    return <BrandedLoadingView message="Cargando tipografía MOVI…" />;
  }

  return (
    <AuthProvider>
      <TripProvider>
        <PushNotificationManager />
        <RootNavigator />
      </TripProvider>
    </AuthProvider>
  );
}

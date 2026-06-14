import { Stack } from 'expo-router';
import { AuthShell } from '../../src/components/AuthShell';

export default function DriverLayout() {
  return (
    <AuthShell>
      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_bottom' }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="history" />
        <Stack.Screen name="trip-active" />
        <Stack.Screen name="subscription" />
        <Stack.Screen name="navigate-passenger" />
        <Stack.Screen name="navigate-destination" />
      </Stack>
    </AuthShell>
  );
}

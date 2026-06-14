import { Stack } from 'expo-router';
import { AuthShell } from '../../src/components/AuthShell';

export default function OwnerLayout() {
  return (
    <AuthShell>
      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
        <Stack.Screen name="dashboard" />
        <Stack.Screen name="vehicles" />
        <Stack.Screen name="vehicle-detail" />
        <Stack.Screen name="register-vehicle" />
        <Stack.Screen name="invite-driver" />
        <Stack.Screen name="reports" />
      </Stack>
    </AuthShell>
  );
}

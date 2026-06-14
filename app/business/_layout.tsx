import { Stack } from 'expo-router';
import { AuthShell } from '../../src/components/AuthShell';

export default function BusinessLayout() {
  return (
    <AuthShell>
      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
        <Stack.Screen name="dashboard" />
        <Stack.Screen name="invoices" />
        <Stack.Screen name="request-delivery" />
        <Stack.Screen name="offers" />
        <Stack.Screen name="delivery-active" />
      </Stack>
    </AuthShell>
  );
}

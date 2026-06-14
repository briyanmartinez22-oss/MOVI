import { Stack } from 'expo-router';
import { AuthShell } from '../../src/components/AuthShell';

export default function AdminLayout() {
  return (
    <AuthShell>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="verifications" />
        <Stack.Screen name="operations" />
        <Stack.Screen name="analytics" />
      </Stack>
    </AuthShell>
  );
}

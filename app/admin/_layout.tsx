import { Stack } from 'expo-router';
import { AuthShell } from '../../src/components/AuthShell';
import { AdminRouteGuard } from '../../src/components/admin/AdminRouteGuard';

export default function AdminLayout() {
  return (
    <AuthShell>
      <AdminRouteGuard>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="verifications" />
          <Stack.Screen name="operations" />
          <Stack.Screen name="operations-live" />
          <Stack.Screen name="analytics" />
          <Stack.Screen name="support" />
          <Stack.Screen name="finance" />
          <Stack.Screen name="security" />
          <Stack.Screen name="audit" />
          <Stack.Screen name="trips/[tripId]" />
          <Stack.Screen name="providers" />
          <Stack.Screen name="trips" />
          <Stack.Screen name="drivers" />
          <Stack.Screen name="passengers" />
          <Stack.Screen name="ratings" />
        </Stack>
      </AdminRouteGuard>
    </AuthShell>
  );
}

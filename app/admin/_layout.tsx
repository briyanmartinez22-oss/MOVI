import { Stack } from 'expo-router';
import { AuthShell } from '../../src/components/AuthShell';
import { AdminRouteGuard } from '../../src/components/admin/AdminRouteGuard';
import { AdminShell } from '../../src/components/admin/AdminShell';

export default function AdminLayout() {
  return (
    <AuthShell>
      <AdminRouteGuard>
        <AdminShell>
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
            <Stack.Screen name="owners" />
            <Stack.Screen name="vehicles" />
            <Stack.Screen name="vehicles/[vehicleId]" />
            <Stack.Screen name="vehicle-invites" />
            <Stack.Screen name="businesses" />
            <Stack.Screen name="deliveries" />
            <Stack.Screen name="subscriptions" />
            <Stack.Screen name="integrations" />
            <Stack.Screen name="settings" />
            <Stack.Screen name="admins" />
            <Stack.Screen name="system-tools" />
          </Stack>
        </AdminShell>
      </AdminRouteGuard>
    </AuthShell>
  );
}

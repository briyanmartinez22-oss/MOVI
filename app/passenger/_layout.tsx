import { Stack } from 'expo-router';
import { AuthShell } from '../../src/components/AuthShell';

export default function PassengerLayout() {
  return (
    <AuthShell>
      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_bottom' }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="destination" />
        <Stack.Screen name="estimate" />
        <Stack.Screen name="matching" />
        <Stack.Screen name="offers" />
        <Stack.Screen name="driver" />
        <Stack.Screen name="trip" />
        <Stack.Screen name="rating" />
      </Stack>
    </AuthShell>
  );
}

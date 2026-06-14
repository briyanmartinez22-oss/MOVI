import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="otp" />
      <Stack.Screen name="register-account" />
      <Stack.Screen name="register-unit-role" />
      <Stack.Screen name="select-role" />
      <Stack.Screen name="register-passenger" />
      <Stack.Screen name="register-identity" />
      <Stack.Screen name="register-owner" />
      <Stack.Screen name="register-driver-code" />
      <Stack.Screen name="register-business" />
      <Stack.Screen name="permissions" />
    </Stack>
  );
}

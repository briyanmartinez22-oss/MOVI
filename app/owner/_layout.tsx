import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AuthShell } from '../../src/components/AuthShell';
import { useOwnerVerificationRedirect } from '../../src/hooks/useOwnerVerificationRedirect';
import { colors } from '../../src/theme';

export default function OwnerLayout() {
  useOwnerVerificationRedirect();

  return (
    <AuthShell>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarStyle: { borderTopColor: colors.borderLight },
          tabBarLabelStyle: { fontSize: 11, fontWeight: '500' },
        }}
      >
        <Tabs.Screen
          name="dashboard"
          options={{
            title: 'Inicio',
            tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="vehicles"
          options={{
            title: 'Unidades',
            tabBarIcon: ({ color, size }) => <Ionicons name="car-outline" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="reports"
          options={{
            title: 'Reportes',
            tabBarIcon: ({ color, size }) => <Ionicons name="bar-chart-outline" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="account"
          options={{
            title: 'Mi cuenta',
            tabBarIcon: ({ color, size }) => <Ionicons name="person-circle-outline" size={size} color={color} />,
          }}
        />
        <Tabs.Screen name="vehicle-detail" options={{ href: null }} />
        <Tabs.Screen name="register-vehicle" options={{ href: null }} />
        <Tabs.Screen name="invite-driver" options={{ href: null }} />
      </Tabs>
    </AuthShell>
  );
}

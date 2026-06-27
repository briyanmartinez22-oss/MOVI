import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AuthShell } from '../../src/components/AuthShell';
import { useOwnerAccessGuard } from '../../src/hooks/useOwnerAccessGuard';
import { ownerCanOperateFleet } from '../../src/domain/moviFlow';
import { useAuth } from '../../src/context/AuthContext';
import { getOwnerByUserId } from '../../src/services/profileData';
import { colors } from '../../src/theme';

export default function OwnerLayout() {
  useOwnerAccessGuard();
  const { user } = useAuth();
  const owner = user ? getOwnerByUserId(user.userId) : null;
  const fleetEnabled = ownerCanOperateFleet(owner?.status);

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
            href: fleetEnabled ? undefined : null,
            tabBarIcon: ({ color, size }) => <Ionicons name="car-outline" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="reports"
          options={{
            title: 'Reportes',
            href: fleetEnabled ? undefined : null,
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

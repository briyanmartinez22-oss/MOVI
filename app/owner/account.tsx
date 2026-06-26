import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Card, ScreenHeader, StatusBadge } from '../../src/components/FormUI';
import { BrandedLoadingView } from '../../src/components/BrandedLoadingView';
import { useAuth } from '../../src/context/AuthContext';
import { useProfileBootstrap } from '../../src/hooks/useProfileBootstrap';
import { getOwnerByUserId } from '../../src/services/profileData';
import { colors, typography, spacing, radius } from '../../src/theme';

export default function OwnerAccount() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { loading } = useProfileBootstrap('owner');
  const owner = user ? getOwnerByUserId(user.userId) : null;

  if (loading) return <BrandedLoadingView message="Cargando…" />;

  const handleLogout = () => {
    Alert.alert('Cerrar sesión', '¿Estás seguro de que deseas salir?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Cerrar sesión',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/welcome');
        },
      },
    ]);
  };

  const statusLabel =
    owner?.status === 'approved' ? 'Aprobado'
    : owner?.status === 'suspended' ? 'Suspendido'
    : owner?.status === 'pending' ? 'Pendiente'
    : owner?.status ?? 'Desconocido';

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Mi cuenta" />
      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.profileCard}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={32} color={colors.textMuted} />
          </View>
          <Text style={styles.name}>{owner?.name ?? user?.name ?? '—'}</Text>
          <Text style={styles.phone}>{user?.phone ?? '—'}</Text>
          <StatusBadge status={statusLabel} />
        </Card>

        <Text style={styles.sectionTitle}>Información</Text>
        <Card>
          <InfoRow label="Nombre" value={owner?.name ?? '—'} />
          <InfoRow label="Teléfono" value={user?.phone ?? '—'} />
          <InfoRow label="Correo" value={owner?.email ?? 'No registrado'} />
          <InfoRow label="DUI" value={owner?.dui ?? '—'} />
        </Card>

        <Text style={styles.sectionTitle}>Acciones</Text>
        <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/notifications' as never)}>
          <Ionicons name="notifications-outline" size={22} color={colors.text} />
          <Text style={styles.menuText}>Notificaciones</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity style={[styles.menuItem, styles.logoutItem]} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={22} color={colors.danger} />
          <Text style={[styles.menuText, { color: colors.danger }]}>Cerrar sesión</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={infoStyles.row}>
      <Text style={infoStyles.label}>{label}</Text>
      <Text style={infoStyles.value}>{value}</Text>
    </View>
  );
}

const infoStyles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  label: { ...typography.caption, color: colors.textSecondary },
  value: { ...typography.body, color: colors.text, textAlign: 'right', maxWidth: '60%' },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md },
  profileCard: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl },
  avatar: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: colors.borderLight,
    alignItems: 'center', justifyContent: 'center',
  },
  name: { ...typography.subtitle, color: colors.text },
  phone: { ...typography.body, color: colors.textSecondary },
  sectionTitle: { ...typography.subtitle, color: colors.text, marginTop: spacing.sm },
  menuItem: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: radius.lg,
    padding: spacing.lg, gap: spacing.md,
  },
  logoutItem: { marginTop: spacing.sm },
  menuText: { ...typography.body, color: colors.text, flex: 1 },
});

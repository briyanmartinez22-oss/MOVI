import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { MoviLogo } from '../../src/components/MoviLogo';
import { BrandTagline } from '../../src/components/BrandTagline';
import { BrandedLoadingView } from '../../src/components/BrandedLoadingView';
import { Card, ScreenHeader } from '../../src/components/FormUI';
import { PrimaryButton } from '../../src/components';
import { useAuth } from '../../src/context/AuthContext';
import { useProfileBootstrap } from '../../src/hooks/useProfileBootstrap';
import {
  getBusinessByUserId,
  getBusinessDashboardStats,
  getDeliveryHistory,
} from '../../src/services/profileData';
import { computeKmSaved } from '../../src/services/analyticsService';
import { ContextualHelpLink } from '../../src/components/help/ContextualHelpLink';
import { colors, typography, spacing, radius } from '../../src/theme';

export default function BusinessDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const { loading } = useProfileBootstrap();
  const business = user ? getBusinessByUserId(user.userId) : null;
  const history = business ? getDeliveryHistory({ businessId: business.id }) : [];
  const bizStats = business ? getBusinessDashboardStats(business.id) : undefined;
  const totalSpent = bizStats?.costs ?? history.reduce((a, h) => a + h.price, 0);
  const orderCount = bizStats?.orders ?? history.length;
  const deliveryCount = bizStats?.deliveries ?? history.length;

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ScreenHeader title="Dashboard negocio" />
        <BrandedLoadingView message="Cargando datos…" />
      </SafeAreaView>
    );
  }

  if (!business) {
    return (
      <SafeAreaView style={styles.container}>
        <ScreenHeader title="Negocio MOVI" />
        <View style={styles.center}>
          <Text style={styles.meta}>Completa el registro de tu negocio</Text>
        </View>
      </SafeAreaView>
    );
  }

  const menu = [
    { title: 'Solicitar entrega', route: '/business/request-delivery', icon: 'cube' as const },
    { title: 'Facturas', route: '/business/invoices', icon: 'receipt' as const },
    { title: 'Historial de entregas', route: '/activity', icon: 'time' as const },
    { title: 'Notificaciones', route: '/notifications', icon: 'notifications' as const },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Dashboard negocio" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.logoWrap}>
          <MoviLogo size="md" />
        </View>
        <BrandTagline variant="secondary" />
        <Text style={styles.greeting}>{business.businessName}</Text>
        <Text style={styles.meta}>{business.businessType} · {business.addressLabel}</Text>

        <View style={styles.statsRow}>
          <Card style={styles.stat}><Text style={styles.statValue}>{orderCount}</Text><Text style={styles.statLabel}>Pedidos</Text></Card>
          <Card style={styles.stat}><Text style={styles.statValue}>{deliveryCount}</Text><Text style={styles.statLabel}>Entregas</Text></Card>
          <TouchableOpacity onPress={() => router.push('/business/invoices')}>
            <Card style={styles.stat}><Text style={styles.statValue}>{bizStats?.invoices ?? 0}</Text><Text style={styles.statLabel}>Facturas</Text></Card>
          </TouchableOpacity>
          <Card style={styles.stat}><Text style={styles.statValue}>${totalSpent.toFixed(2)}</Text><Text style={styles.statLabel}>Costos</Text></Card>
          <Card style={styles.stat}><Text style={styles.statValue}>{business.rating.toFixed(1)}</Text><Text style={styles.statLabel}>Calificación</Text></Card>
        </View>

        <Card style={styles.banner}>
          <Text style={styles.bannerTitle}>MOVI ahorra kilómetros</Text>
          <Text style={styles.bannerText}>
            {computeKmSaved(0, history.length)} km de recorridos innecesarios evitados en tus entregas digitales.
          </Text>
        </Card>

        <PrimaryButton title="Nueva entrega" onPress={() => router.push('/business/request-delivery')} />

        {menu.map((item) => (
          <TouchableOpacity key={item.route} style={styles.menuItem} onPress={() => router.push(item.route as never)}>
            <Ionicons name={item.icon} size={22} color={colors.text} />
            <Text style={styles.menuText}>{item.title}</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        ))}
        <ContextualHelpLink sectionId="business-guide" />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  logoWrap: { alignItems: 'center', marginBottom: spacing.xs },
  greeting: { ...typography.subtitle, color: colors.text, marginTop: spacing.sm },
  meta: { ...typography.caption, color: colors.textSecondary, marginBottom: spacing.lg, textTransform: 'capitalize' },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  stat: { width: '30%', alignItems: 'center', minWidth: 100 },
  statValue: { ...typography.subtitle, color: colors.text },
  statLabel: { ...typography.caption, color: colors.textSecondary, marginTop: 4 },
  banner: { marginBottom: spacing.lg, backgroundColor: colors.borderLight },
  bannerTitle: { ...typography.bodyMedium, color: colors.text },
  bannerText: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: radius.lg,
    marginTop: spacing.sm,
    gap: spacing.md,
  },
  menuText: { ...typography.body, color: colors.text, flex: 1 },
});

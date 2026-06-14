import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader } from '../../src/components/FormUI';
import { useAuth } from '../../src/context/AuthContext';
import { getBusinessByUserId, getDeliveryHistory, formatDate } from '../../src/services/profileData';
import { colors, typography, spacing, radius } from '../../src/theme';

type InvoiceStatus = 'paid' | 'pending' | 'overdue';

interface MockInvoice {
  id: string;
  number: string;
  issuedAt: string;
  amount: number;
  deliveryCount: number;
  status: InvoiceStatus;
}

const STATUS_LABELS: Record<InvoiceStatus, string> = {
  paid: 'Pagada',
  pending: 'Pendiente',
  overdue: 'Vencida',
};

const STATUS_COLORS: Record<InvoiceStatus, string> = {
  paid: colors.online,
  pending: colors.warning,
  overdue: colors.danger,
};

function buildMockInvoices(businessId: string, businessName: string): MockInvoice[] {
  const history = getDeliveryHistory({ businessId });
  const baseCount = Math.max(3, Math.min(8, history.length || 5));

  return Array.from({ length: baseCount }, (_, i) => {
    const slice = history.slice(i * 2, i * 2 + 3);
    const amount = slice.length
      ? slice.reduce((sum, row) => sum + row.price, 0)
      : 12.5 + i * 4.75;
    const statuses: InvoiceStatus[] = ['paid', 'paid', 'pending', 'overdue'];
    const issued = new Date();
    issued.setDate(issued.getDate() - (i + 1) * 12);

    return {
      id: `inv-${businessId}-${i + 1}`,
      number: `MOVI-${businessName.slice(0, 3).toUpperCase()}-${String(1000 + i)}`,
      issuedAt: issued.toISOString(),
      amount: Math.round(amount * 100) / 100,
      deliveryCount: slice.length || 2 + (i % 3),
      status: statuses[i % statuses.length],
    };
  });
}

export default function BusinessInvoicesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const business = user ? getBusinessByUserId(user.userId) : null;
  const invoices = business ? buildMockInvoices(business.id, business.businessName) : [];
  const totalPending = invoices
    .filter((inv) => inv.status !== 'paid')
    .reduce((sum, inv) => sum + inv.amount, 0);

  if (!business) {
    return (
      <SafeAreaView style={styles.container}>
        <ScreenHeader title="Facturas" />
        <View style={styles.center}>
          <Text style={styles.meta}>Negocio no encontrado</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Facturas MOVI" />
      <View style={styles.summary}>
        <Text style={styles.summaryLabel}>Saldo pendiente</Text>
        <Text style={styles.summaryValue}>${totalPending.toFixed(2)}</Text>
        <Text style={styles.summaryMeta}>{invoices.length} facturas · {business.businessName}</Text>
      </View>

      <FlatList
        data={invoices}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} activeOpacity={0.85}>
            <View style={styles.cardHeader}>
              <Text style={styles.invoiceNumber}>{item.number}</Text>
              <View style={[styles.statusPill, { backgroundColor: STATUS_COLORS[item.status] }]}>
                <Text style={styles.statusText}>{STATUS_LABELS[item.status]}</Text>
              </View>
            </View>
            <Text style={styles.date}>{formatDate(item.issuedAt)}</Text>
            <View style={styles.cardFooter}>
              <Text style={styles.amount}>${item.amount.toFixed(2)}</Text>
              <View style={styles.deliveryRow}>
                <Ionicons name="cube-outline" size={14} color={colors.textSecondary} />
                <Text style={styles.deliveryCount}>{item.deliveryCount} entregas</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>No hay facturas registradas</Text>
        }
      />

      <TouchableOpacity style={styles.backLink} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={18} color={colors.primary} />
        <Text style={styles.backText}>Volver al dashboard</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  summary: {
    margin: spacing.lg,
    marginBottom: spacing.sm,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  summaryLabel: { ...typography.caption, color: colors.textSecondary },
  summaryValue: { ...typography.price, color: colors.text, marginTop: 4 },
  summaryMeta: { ...typography.caption, color: colors.textMuted, marginTop: spacing.xs },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.sm },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: spacing.sm,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  invoiceNumber: { ...typography.bodyMedium, color: colors.text },
  statusPill: { paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.full },
  statusText: { ...typography.caption, color: colors.primaryText, fontWeight: '600' },
  date: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  amount: { ...typography.subtitle, color: colors.text },
  deliveryRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  deliveryCount: { ...typography.caption, color: colors.textSecondary },
  empty: { ...typography.body, color: colors.textMuted, textAlign: 'center', padding: spacing.xl },
  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    padding: spacing.lg,
  },
  backText: { ...typography.bodyMedium, color: colors.primary },
  meta: { ...typography.body, color: colors.textSecondary },
});

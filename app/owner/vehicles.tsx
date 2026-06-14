import { Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BrandedLoadingView } from '../../src/components/BrandedLoadingView';
import { ScreenHeader, StatusBadge } from '../../src/components/FormUI';
import { VehicleBadge } from '../../src/components';
import { getOwnerByUserId, getOwnerVehicles } from '../../src/services/profileData';
import { getVehicleApprovalHint } from '../../src/utils/vehicleStatus';
import { useAuth } from '../../src/context/AuthContext';
import { useProfileBootstrap } from '../../src/hooks/useProfileBootstrap';
import { colors, typography, spacing, radius } from '../../src/theme';

export default function OwnerVehicles() {
  const router = useRouter();
  const { user } = useAuth();
  const { loading, error } = useProfileBootstrap('owner');
  const owner = user ? getOwnerByUserId(user.userId) : null;
  const vehicles = owner ? getOwnerVehicles(owner.id) : [];

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ScreenHeader title="Mis unidades" />
        <BrandedLoadingView message="Cargando unidades…" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Mis unidades" />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <FlatList
        data={vehicles}
        keyExtractor={(item) => item.vehicleId}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/owner/register-vehicle')}>
            <Ionicons name="add" size={22} color={colors.primaryText} />
            <Text style={styles.addText}>Registrar nueva unidad</Text>
          </TouchableOpacity>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push({ pathname: '/owner/vehicle-detail', params: { id: item.vehicleId } })}
          >
            <VehicleBadge type={item.vehicleType} compact />
            <Text style={styles.unit}>Unidad #{item.unitNumber}</Text>
            <Text style={styles.plate}>Placa {item.plateNumber}</Text>
            <StatusBadge status={item.status} />
            {item.status !== 'approved' && getVehicleApprovalHint(item.status) ? (
              <Text style={styles.pendingHint}>{getVehicleApprovalHint(item.status)}</Text>
            ) : null}
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.lg, gap: spacing.md },
  error: { ...typography.caption, color: colors.danger, paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, borderRadius: radius.md, padding: spacing.md, gap: spacing.sm, marginBottom: spacing.md },
  addText: { ...typography.button, color: colors.primaryText },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.sm, borderWidth: 1, borderColor: colors.borderLight },
  unit: { ...typography.subtitle, color: colors.text },
  plate: { ...typography.body, color: colors.textSecondary },
  pendingHint: { ...typography.caption, color: colors.warning },
});

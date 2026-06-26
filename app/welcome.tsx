import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, LayoutAnimation, Platform, UIManager } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { MoviLogo } from '../src/components/MoviLogo';
import { PrimaryButton } from '../src/components/PrimaryButton';
import { colors, typography, spacing, radius } from '../src/theme';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function WelcomeScreen() {
  const router = useRouter();
  const [unitExpanded, setUnitExpanded] = useState(false);

  const toggleUnit = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setUnitExpanded((v) => !v);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <MoviLogo size="lg" />
        <Text style={styles.tagline}>
          La plataforma de movilidad, entregas y logística de Latinoamérica
        </Text>

        <View style={styles.options}>
          {/* Pasajero */}
          <TouchableOpacity
            style={styles.card}
            onPress={() =>
              router.push({
                pathname: '/auth/register-identity',
                params: { returnRoute: '/auth/register-passenger', pendingFlow: 'passenger_register' },
              } as never)
            }
          >
            <View style={styles.iconWrap}>
              <Ionicons name="person" size={24} color={colors.brandRed} />
            </View>
            <View style={styles.cardInfo}>
              <Text style={styles.cardTitle}>Quiero solicitar viajes o entregas</Text>
              <Text style={styles.cardDesc}>Pasajero: viajes, comida y paquetería</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>

          {/* Unidad — expandible */}
          <TouchableOpacity style={[styles.card, unitExpanded && styles.cardActive]} onPress={toggleUnit}>
            <View style={styles.iconWrap}>
              <Ionicons name="car-sport" size={24} color={colors.brandBlack} />
            </View>
            <View style={styles.cardInfo}>
              <Text style={styles.cardTitle}>Tengo o conduzco una unidad</Text>
              <Text style={styles.cardDesc}>Dueño de unidad o conductor con invitación</Text>
            </View>
            <Ionicons name={unitExpanded ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textMuted} />
          </TouchableOpacity>

          {unitExpanded && (
            <View style={styles.subOptions}>
              <TouchableOpacity
                style={styles.subCard}
                onPress={() =>
                  router.push({
                    pathname: '/auth/register-identity',
                    params: { returnRoute: '/auth/register-owner', pendingFlow: 'owner_register' },
                  } as never)
                }
              >
                <Ionicons name="business" size={20} color={colors.brandBlack} />
                <View style={styles.subInfo}>
                  <Text style={styles.subTitle}>Soy dueño de unidad(es)</Text>
                  <Text style={styles.subDesc}>Registra vehículos, conductores y reportes</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.subCard}
                onPress={() =>
                  router.push({
                    pathname: '/auth/register-identity',
                    params: { returnRoute: '/auth/register-driver-code', pendingFlow: 'driver_register' },
                  } as never)
                }
              >
                <Ionicons name="car" size={20} color={colors.brandBlack} />
                <View style={styles.subInfo}>
                  <Text style={styles.subTitle}>Tengo código de invitación</Text>
                  <Text style={styles.subDesc}>El dueño te compartió un código de unidad</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          )}

          {/* Negocio */}
          <TouchableOpacity
            style={styles.card}
            onPress={() =>
              router.push({
                pathname: '/auth/register-identity',
                params: { returnRoute: '/auth/register-business', pendingFlow: 'business_register' },
              } as never)
            }
          >
            <View style={styles.iconWrap}>
              <Ionicons name="storefront" size={24} color={colors.brandRed} />
            </View>
            <View style={styles.cardInfo}>
              <Text style={styles.cardTitle}>Tengo un negocio</Text>
              <Text style={styles.cardDesc}>Comercio con logística y reparto</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        <View style={styles.bottomActions}>
          <PrimaryButton
            title="Iniciar sesión"
            onPress={() => router.push('/auth/login')}
            style={styles.loginBtn}
          />
          <TouchableOpacity onPress={() => router.push('/learn')}>
            <Text style={styles.learnLink}>Aprender sobre MOVI</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.brandWhite },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    paddingTop: spacing.xl,
    gap: spacing.lg,
  },
  tagline: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  options: { gap: spacing.sm },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  cardActive: { borderWidth: 1, borderColor: colors.primary },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: { flex: 1 },
  cardTitle: { ...typography.bodyMedium, color: colors.text },
  cardDesc: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  subOptions: {
    marginLeft: spacing.xl,
    gap: spacing.xs,
  },
  subCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  subInfo: { flex: 1 },
  subTitle: { ...typography.bodyMedium, color: colors.text, fontSize: 14 },
  subDesc: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  bottomActions: { gap: spacing.sm, marginTop: spacing.md },
  loginBtn: {},
  learnLink: {
    ...typography.body,
    color: colors.primary,
    textAlign: 'center',
  },
});

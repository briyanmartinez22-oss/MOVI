import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { PrimaryButton } from '../../src/components/PrimaryButton';
import { MoviLogo } from '../../src/components/MoviLogo';
import { ScreenHeader } from '../../src/components/FormUI';
import { useAuth } from '../../src/context/AuthContext';
import {
  hasPermissionsAccepted,
  markPermissionsAccepted,
  stripPermissionsNavParams,
  type PendingRegistrationFlow,
} from '../../src/services/permissionsFlowService';
import { getRoleHomeRoute } from '../../src/utils/platform';
import { resolveCurrentProfiles } from '../../src/services/mockApi';
import { colors, typography, spacing, radius } from '../../src/theme';

const PERMISSIONS = [
  {
    icon: 'location' as const,
    title: 'Ubicación',
    desc: 'Para mostrar tu posición en el mapa, calcular rutas y asignar viajes cercanos con precisión.',
    when: 'Durante viajes activos y cuando estés conectado como conductor.',
  },
  {
    icon: 'camera' as const,
    title: 'Cámara',
    desc: 'Para fotografiar tu DUI, licencia y documentos de verificación de identidad o vehículo.',
    when: 'Solo al subir documentos en registro o verificación.',
  },
  {
    icon: 'notifications' as const,
    title: 'Notificaciones',
    desc: 'Para avisarte de solicitudes, ofertas, llegada del conductor y mensajes del viaje.',
    when: 'Puedes desactivarlas después en ajustes del sistema.',
  },
];

const FLOW_BACK_ROUTES: Record<PendingRegistrationFlow, string> = {
  passenger_register: '/auth/register-passenger',
  owner_register: '/auth/register-identity',
  driver_register: '/auth/register-identity',
  business_register: '/auth/register-identity',
};

function isPendingFlow(value: string | undefined): value is PendingRegistrationFlow {
  return (
    value === 'passenger_register' ||
    value === 'owner_register' ||
    value === 'driver_register' ||
    value === 'business_register'
  );
}

export default function PermissionsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<Record<string, string>>();
  const { requestOtp } = useAuth();
  const [checking, setChecking] = useState(true);
  const [continuing, setContinuing] = useState(false);
  const [error, setError] = useState('');

  const pendingFlow = isPendingFlow(params.pendingFlow) ? params.pendingFlow : undefined;
  const nextRoute = params.nextRoute;
  const forwardParams = stripPermissionsNavParams(params);

  useEffect(() => {
    let cancelled = false;

    const maybeSkip = async () => {
      if (!pendingFlow || !nextRoute) {
        if (!cancelled) setChecking(false);
        return;
      }
      if (await hasPermissionsAccepted(pendingFlow)) {
        if (nextRoute === '/auth/otp' && forwardParams.phone) {
          const otpRes = await requestOtp(forwardParams.phone);
          if (!otpRes.ok) {
            if (!cancelled) {
              setError(otpRes.error ?? 'No se pudo enviar el OTP');
              setChecking(false);
            }
            return;
          }
        }
        router.replace({ pathname: nextRoute as never, params: forwardParams });
        return;
      }
      if (!cancelled) setChecking(false);
    };

    void maybeSkip();
    return () => {
      cancelled = true;
    };
  }, [pendingFlow, nextRoute]);

  const handleContinue = async () => {
    if (!nextRoute) {
      const { user } = resolveCurrentProfiles();
      router.replace(user ? (getRoleHomeRoute(user.role) as never) : '/welcome');
      return;
    }

    setContinuing(true);
    setError('');
    try {
      if (pendingFlow) {
        await markPermissionsAccepted(pendingFlow);
      }

      if (nextRoute === '/auth/otp' && forwardParams.phone) {
        const otpRes = await requestOtp(forwardParams.phone);
        if (!otpRes.ok) {
          setError(otpRes.error ?? 'No se pudo enviar el OTP');
          return;
        }
      }

      router.replace({ pathname: nextRoute as never, params: forwardParams });
    } finally {
      setContinuing(false);
    }
  };

  const handleBack = () => {
    if (pendingFlow) {
      router.replace({
        pathname: FLOW_BACK_ROUTES[pendingFlow] as never,
        params: { ...forwardParams, pendingFlow },
      });
      return;
    }
    router.replace('/welcome');
  };

  if (checking) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.brandRed} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Permisos" onBack={handleBack} />
      <View style={styles.content}>
        <MoviLogo size="md" style={styles.logo} />
        <Text style={styles.intro}>
          MOVI necesita algunos permisos de tu dispositivo para ofrecerte una experiencia segura y
          en tiempo real. Te explicamos cada uno antes de solicitarlos.
        </Text>
        {PERMISSIONS.map((item) => (
          <View key={item.title} style={styles.card}>
            <View style={styles.iconWrap}>
              <Ionicons name={item.icon} size={24} color={colors.brandRed} />
            </View>
            <View style={styles.info}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.desc}>{item.desc}</Text>
              <Text style={styles.when}>{item.when}</Text>
            </View>
          </View>
        ))}
        <Text style={styles.note}>
          Al continuar, el sistema podrá mostrar los diálogos nativos de permisos. Puedes cambiar tu
          decisión más tarde en Configuración.
        </Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <PrimaryButton
          title="Entendido, continuar"
          onPress={handleContinue}
          loading={continuing}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { flex: 1, padding: spacing.lg, gap: spacing.md, alignItems: 'center' },
  logo: { marginBottom: spacing.xs },
  intro: { ...typography.body, color: colors.textSecondary, lineHeight: 22, marginBottom: spacing.sm },
  card: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.md,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { flex: 1 },
  title: { ...typography.bodyMedium, color: colors.text },
  desc: { ...typography.caption, color: colors.text, marginTop: 4, lineHeight: 18 },
  when: { ...typography.caption, color: colors.textMuted, marginTop: spacing.xs, fontStyle: 'italic' },
  note: { ...typography.caption, color: colors.textMuted, lineHeight: 18, marginTop: spacing.sm },
  error: { ...typography.caption, color: colors.danger, textAlign: 'center' },
});

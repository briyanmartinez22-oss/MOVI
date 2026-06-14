import { ScrollView, Text, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MoviLogo } from '../../src/components/MoviLogo';
import { ScreenHeader } from '../../src/components/FormUI';
import { colors, typography, spacing } from '../../src/theme';

const SECTIONS = [
  {
    title: '1. Aceptación de los términos',
    body: 'Al acceder o utilizar la plataforma MOVI («la Plataforma»), usted acepta quedar vinculado por estos Términos y Condiciones de Uso. Si no está de acuerdo, debe abstenerse de utilizar los servicios.',
  },
  {
    title: '2. Descripción del servicio',
    body: 'MOVI es una plataforma tecnológica de movilidad que conecta pasajeros, conductores, propietarios de unidades y negocios para la intermediación de viajes en mototaxi, entregas de comida, mensajería, paquetería y servicios logísticos asociados. MOVI no presta directamente el transporte; actúa como intermediario digital.',
  },
  {
    title: '3. Registro y veracidad de datos',
    body: 'El usuario declara que la información proporcionada —incluido número de teléfono, Documento Único de Identidad (DUI) y demás datos de verificación— es veraz, actual y completa. MOVI podrá solicitar documentación adicional y suspender cuentas ante inconsistencias o fraude.',
  },
  {
    title: '4. Uso permitido',
    body: 'Queda prohibido el uso de la Plataforma con fines ilícitos, la suplantación de identidad, la manipulación de tarifas u ofertas, el acoso a otros usuarios y cualquier conducta que ponga en riesgo la seguridad vial o la integridad de las personas.',
  },
  {
    title: '5. Tarifas, pagos y comisiones',
    body: 'Las tarifas se acuerdan entre las partes según las reglas de la Plataforma. Los conductores y propietarios son responsables de sus obligaciones fiscales. Las políticas de suscripción, promociones y períodos gratuitos se publicarán en la aplicación y podrán actualizarse con aviso razonable.',
  },
  {
    title: '6. Responsabilidad',
    body: 'En la medida permitida por la ley aplicable en El Salvador, MOVI no será responsable por daños indirectos derivados del uso del servicio. Los usuarios participan en viajes y entregas bajo su propio riesgo, debiendo cumplir la normativa de tránsito vigente.',
  },
  {
    title: '7. Modificaciones',
    body: 'MOVI podrá modificar estos términos. El uso continuado de la Plataforma tras la publicación de cambios constituye aceptación de los mismos. Se recomienda revisar periódicamente esta sección.',
  },
  {
    title: '8. Contacto',
    body: 'Para consultas sobre estos términos: legal@movi.app (placeholder). Última actualización: junio de 2026.',
  },
];

export default function TermsScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Términos y condiciones" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.logoWrap}>
          <MoviLogo size="md" />
        </View>
        <Text style={styles.intro}>
          Términos y Condiciones de Uso de la plataforma de movilidad MOVI. Texto provisional
          sujeto a revisión legal.
        </Text>
        {SECTIONS.map((section) => (
          <Text key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}{'\n'}</Text>
            {section.body}
          </Text>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  logoWrap: { alignItems: 'center', marginBottom: spacing.sm },
  intro: { ...typography.body, color: colors.textSecondary, marginBottom: spacing.lg },
  section: { ...typography.body, color: colors.text, marginBottom: spacing.lg, lineHeight: 22 },
  sectionTitle: { ...typography.bodyMedium, color: colors.text },
});

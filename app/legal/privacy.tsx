import { ScrollView, Text, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MoviLogo } from '../../src/components/MoviLogo';
import { ScreenHeader } from '../../src/components/FormUI';
import { colors, typography, spacing } from '../../src/theme';

const SECTIONS = [
  {
    title: '1. Responsable del tratamiento',
    body: 'MOVI («nosotros») trata datos personales conforme a principios de licitud, transparencia y minimización, en el marco de la prestación de servicios de movilidad y logística en El Salvador.',
  },
  {
    title: '2. Datos que recopilamos',
    body: 'Podemos tratar: identificación (DUI, nombre), contacto (teléfono), ubicación en tiempo real durante viajes activos, imágenes para verificación (documentos, selfie), historial de viajes, valoraciones, datos del dispositivo y registros de uso de la aplicación.',
  },
  {
    title: '3. Finalidades',
    body: 'Los datos se utilizan para crear y administrar cuentas, verificar identidad, facilitar viajes y entregas, procesar pagos, enviar notificaciones operativas, mejorar la seguridad, prevenir fraude y cumplir obligaciones legales.',
  },
  {
    title: '4. Ubicación, cámara y notificaciones',
    body: 'Solicitamos permisos de ubicación para asignar viajes y mostrar mapas; cámara para cargar documentos de verificación; y notificaciones para alertas de viaje, ofertas y mensajes. Puede gestionar permisos desde la configuración de su dispositivo.',
  },
  {
    title: '5. Compartición de datos',
    body: 'Compartimos datos estrictamente necesarios entre pasajeros, conductores, propietarios y negocios vinculados a un servicio. Podemos usar proveedores de infraestructura (hosting, mapas, mensajería) bajo acuerdos de confidencialidad.',
  },
  {
    title: '6. Conservación y seguridad',
    body: 'Conservamos los datos el tiempo necesario para las finalidades descritas y obligaciones legales. Aplicamos medidas técnicas y organizativas razonables para proteger la información frente a acceso no autorizado.',
  },
  {
    title: '7. Derechos del titular',
    body: 'Usted puede solicitar acceso, rectificación o eliminación de datos, así como oponerse a ciertos tratamientos, contactando a privacidad@movi.app (placeholder). Responderemos en plazos razonables según la normativa aplicable.',
  },
  {
    title: '8. Menores de edad',
    body: 'Los servicios están dirigidos a mayores de edad conforme a la legislación salvadoreña. No recopilamos deliberadamente datos de menores sin autorización parental verificable.',
  },
  {
    title: '9. Cambios',
    body: 'Esta política puede actualizarse. La fecha de la última versión se indicará en la aplicación. El uso continuado implica conocimiento de la versión vigente.',
  },
];

export default function PrivacyScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Política de privacidad" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.logoWrap}>
          <MoviLogo size="md" />
        </View>
        <Text style={styles.intro}>
          Política de Privacidad y tratamiento de datos personales en la plataforma MOVI. Texto
          provisional sujeto a revisión legal.
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

import { Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Card } from '../../src/components/FormUI';
import { AdminModulePage } from '../../src/components/admin/AdminModulePage';
import { typography, spacing, colors } from '../../src/theme';

const SETTINGS = [
  { title: 'OTP / Twilio', desc: 'Proveedor OTP, Verify Service SID' },
  { title: 'Google Maps', desc: 'API key y modo maps activo' },
  { title: 'Cloudinary', desc: 'Storage de documentos e imágenes' },
  { title: 'Comisiones y tarifas', desc: 'Parámetros globales de pricing' },
  { title: 'Proveedores externos', desc: 'Push, pagos, SMS' },
];

export default function AdminSettingsScreen() {
  const router = useRouter();

  return (
    <AdminModulePage
      title="Settings"
      subtitle="Configuración global — SUPER_ADMIN only"
      onBack={() => router.replace('/admin')}
    >
      <Text style={styles.note}>
        La edición en vivo de variables se gestiona en Railway / .env del backend. SUPER_ADMIN tiene
        acceso de lectura vía Integrations y System Tools.
      </Text>
      {SETTINGS.map((s) => (
        <Card key={s.title} style={styles.card}>
          <Text style={styles.title}>{s.title}</Text>
          <Text style={styles.desc}>{s.desc}</Text>
        </Card>
      ))}
    </AdminModulePage>
  );
}

const styles = StyleSheet.create({
  note: { ...typography.caption, color: colors.textSecondary, marginBottom: spacing.md },
  card: { marginBottom: spacing.md },
  title: { ...typography.bodyMedium, color: colors.text },
  desc: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs },
});

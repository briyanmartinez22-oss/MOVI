import { useEffect, useState } from 'react';
import { Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Card } from '../../src/components/FormUI';
import { AdminModulePage } from '../../src/components/admin/AdminModulePage';
import { fetchAdminStaffList } from '../../src/services/api';
import { typography, spacing, colors } from '../../src/theme';

type AdminRow = {
  userId: string;
  fullName: string;
  phoneNumber: string;
  staffRole: string;
};

export default function AdminAdminsScreen() {
  const router = useRouter();
  const [items, setItems] = useState<AdminRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      setItems((await fetchAdminStaffList()) as AdminRow[]);
      setLoading(false);
    })();
  }, []);

  return (
    <AdminModulePage
      title="Admins"
      subtitle="Administradores y roles staff"
      loading={loading}
      empty={items.length === 0 ? 'Sin administradores staff' : undefined}
      onBack={() => router.replace('/admin')}
    >
      {items.map((a) => (
        <Card key={a.userId} style={styles.card}>
          <Text style={styles.title}>{a.fullName}</Text>
          <Text style={styles.line}>{a.phoneNumber}</Text>
          <Text style={styles.role}>{a.staffRole}</Text>
        </Card>
      ))}
    </AdminModulePage>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.md },
  title: { ...typography.bodyMedium, color: colors.text },
  line: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs },
  role: { ...typography.caption, color: colors.brandRed, marginTop: spacing.xs, fontWeight: '700' },
});

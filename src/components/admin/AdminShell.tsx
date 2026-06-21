import { View, StyleSheet } from 'react-native';
import { AdminSidebar } from './AdminSidebar';
import { useAdminActor } from '../../hooks/useAdminPermission';

type Props = { children: React.ReactNode };

export function AdminShell({ children }: Props) {
  const { actor } = useAdminActor();
  const showSidebar = actor.staffRole === 'SUPER_ADMIN';

  return (
    <View style={styles.root}>
      {showSidebar ? <AdminSidebar /> : null}
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, flexDirection: 'row', backgroundColor: '#fff' },
  content: { flex: 1, minWidth: 0 },
});

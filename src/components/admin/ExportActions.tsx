import { View, StyleSheet, Alert } from 'react-native';
import { PrimaryButton } from '../PrimaryButton';
import { exportReport } from '../../services/analyticsService';
import { spacing } from '../../theme';

export function ExportActions() {
  const handleExport = (format: 'pdf' | 'excel') => {
    const report = exportReport(format);
    Alert.alert(
      'Exportación preparada',
      `${report.filename}\n${report.rows.length} filas listas para ${format.toUpperCase()} (mock).`
    );
  };

  return (
    <View style={styles.row}>
      <PrimaryButton
        title="Exportar PDF"
        onPress={() => handleExport('pdf')}
        variant="outline"
        style={styles.btn}
      />
      <PrimaryButton
        title="Exportar Excel"
        onPress={() => handleExport('excel')}
        variant="outline"
        style={styles.btn}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
  btn: { flex: 1, height: 48 },
});

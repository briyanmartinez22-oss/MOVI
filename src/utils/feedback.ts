import { Alert } from 'react-native';

export function showSuccess(title: string, message?: string) {
  Alert.alert(title, message ?? 'Operación completada correctamente.');
}

export function showError(title: string, message?: string) {
  Alert.alert(title, message ?? 'Ocurrió un error. Intenta de nuevo.');
}

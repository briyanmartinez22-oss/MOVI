import { Alert, Platform } from 'react-native';

function showAlert(title: string, message: string) {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.alert) {
    window.alert(message ? `${title}\n\n${message}` : title);
    return;
  }
  Alert.alert(title, message);
}

export function showSuccess(title: string, message?: string) {
  showAlert(title, message ?? 'Operación completada correctamente.');
}

export function showError(title: string, message?: string) {
  showAlert(title, message ?? 'Ocurrió un error. Intenta de nuevo.');
}

import { useEffect } from 'react';
import { Keyboard } from 'react-native';
import { usePathname } from 'expo-router';

/** Cierra el teclado al cambiar de pantalla (Expo Router). */
export function useKeyboardDismissOnNavigate() {
  const pathname = usePathname();

  useEffect(() => {
    Keyboard.dismiss();
  }, [pathname]);
}

/** Alias para uso en pantallas y documentación. */
export const useKeyboardDismiss = useKeyboardDismissOnNavigate;

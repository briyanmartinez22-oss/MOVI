import { useFonts, Inter_700Bold } from '@expo-google-fonts/inter';

export function useBrandFonts() {
  const [loaded] = useFonts({ Inter_700Bold });
  return loaded;
}

import { useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, type StyleProp, type ViewStyle } from 'react-native';
import { brand, LOGO_DOT_SIZES, LOGO_FONT_SIZES } from '../theme/brand';
import { fonts } from '../theme/fonts';
import { resetDemoEnvironment } from '../services/demoResetService';

type Variant = 'default' | 'inverse' | 'onDark';
type LogoSize = keyof typeof LOGO_FONT_SIZES;

type Props = {
  variant?: Variant;
  size?: LogoSize;
  suffix?: string;
  onDemoReset?: () => void | Promise<void>;
  style?: StyleProp<ViewStyle>;
};

const DEMO_TAP_COUNT = 5;
const DEMO_TAP_WINDOW_MS = 2000;

/**
 * Wordmark oficial MOVI — Inter Bold.
 * La letra I es visible; el cuadrado rojo #E53935 reemplaza solo el punto de la i.
 */
export function MoviLogo({
  variant = 'default',
  size = 'md',
  suffix = '',
  onDemoReset,
  style,
}: Props) {
  const fontSize = LOGO_FONT_SIZES[size];
  const squareSize = LOGO_DOT_SIZES[size];
  const dotGap = Math.max(2, Math.round(fontSize * 0.06));
  const textColor =
    variant === 'inverse' || variant === 'onDark' ? brand.white : brand.black;

  const tapTimesRef = useRef<number[]>([]);

  const handleLogoPress = () => {
    const now = Date.now();
    const recent = [...tapTimesRef.current, now].filter((t) => now - t <= DEMO_TAP_WINDOW_MS);
    tapTimesRef.current = recent;

    if (recent.length < DEMO_TAP_COUNT) return;

    tapTimesRef.current = [];

    Alert.alert(
      'Restablecer entorno demo',
      'Se borrarán datos locales y la sesión actual. ¿Continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              await resetDemoEnvironment();
              await onDemoReset?.();
            })();
          },
        },
      ]
    );
  };

  const letterStyle = {
    fontSize,
    lineHeight: fontSize * 1.05,
    color: textColor,
    fontFamily: fonts.interBold,
    fontWeight: '700' as const,
  };

  return (
    <Pressable
      onPress={handleLogoPress}
      accessibilityRole="button"
      accessibilityLabel="Logo MOVI"
      hitSlop={8}
      style={[styles.pressable, style]}
    >
      <View style={styles.row}>
        <Text style={[styles.mov, letterStyle]}>MOV</Text>
        <View style={[styles.iGlyph, { marginLeft: Math.round(fontSize * 0.04) }]}>
          <View style={[styles.dotRow, { height: squareSize + dotGap, marginBottom: dotGap }]}>
            <View
              style={[
                styles.redSquare,
                { width: squareSize, height: squareSize },
              ]}
            />
          </View>
          <Text style={[styles.iLetter, letterStyle]}>I</Text>
        </View>
        {suffix ? (
          <Text
            style={[
              styles.suffix,
              {
                fontSize: fontSize * 0.42,
                lineHeight: fontSize * 0.5,
                color: textColor,
                fontFamily: fonts.interBold,
              },
            ]}
          >
            {suffix}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    alignSelf: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  mov: {
    letterSpacing: 2,
  },
  iGlyph: {
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  dotRow: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    width: '100%',
  },
  iLetter: {
    letterSpacing: 0,
    textAlign: 'center',
  },
  redSquare: {
    backgroundColor: brand.red,
    borderRadius: 1,
  },
  suffix: {
    fontWeight: '600',
    marginLeft: 6,
    marginBottom: 2,
  },
});

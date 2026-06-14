import { Text, StyleSheet, type StyleProp, type TextStyle } from 'react-native';
import {
  TAGLINE_PRIMARY,
  TAGLINE_SECONDARY,
  TAGLINE_DRIVER,
} from '../theme/brand';
import { colors, typography } from '../theme';

type Variant = 'primary' | 'secondary' | 'driver';

type Props = {
  variant?: Variant;
  style?: StyleProp<TextStyle>;
};

const TAGLINES: Record<Variant, string> = {
  primary: TAGLINE_PRIMARY,
  secondary: TAGLINE_SECONDARY,
  driver: TAGLINE_DRIVER,
};

export function BrandTagline({ variant = 'secondary', style }: Props) {
  return (
    <Text
      style={[
        variant === 'primary' ? styles.primary : styles.secondary,
        style,
      ]}
    >
      {TAGLINES[variant]}
    </Text>
  );
}

const styles = StyleSheet.create({
  primary: {
    ...typography.caption,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 340,
  },
  secondary: {
    ...typography.subtitle,
    fontSize: 18,
    lineHeight: 26,
    color: colors.text,
    textAlign: 'center',
    maxWidth: 320,
  },
});

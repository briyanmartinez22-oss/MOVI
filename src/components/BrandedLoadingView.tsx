import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { MoviLogo } from './MoviLogo';
import { BrandTagline } from './BrandTagline';
import { brand } from '../theme/brand';
import { colors, typography } from '../theme';

type Props = {
  message?: string;
  onDemoReset?: () => void | Promise<void>;
};

export function BrandedLoadingView({ message, onDemoReset }: Props) {
  return (
    <View style={styles.container}>
      <MoviLogo size="lg" onDemoReset={onDemoReset} />
      <BrandTagline variant="secondary" />
      <ActivityIndicator size="large" color={brand.red} style={styles.spinner} />
      {message ? <Text style={styles.message}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brandWhite,
    gap: 24,
    padding: 24,
  },
  spinner: {
    marginTop: 8,
  },
  message: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});

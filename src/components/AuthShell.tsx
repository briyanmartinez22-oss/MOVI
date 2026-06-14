import { type ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import { LogoutButton } from './LogoutButton';

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <View style={styles.container}>
      {children}
      <LogoutButton />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

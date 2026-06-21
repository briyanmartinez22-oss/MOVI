import { type ReactNode, Component, type ErrorInfo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { HelpVisibilityProvider, useHelpVisibility } from '../context/HelpVisibilityContext';
import { logDiagnostic } from '../services/diagnosticsService';
import { isDevDiagnosticsEnabled } from '../utils/devMode';
import { useKeyboardDismissOnNavigate } from '../hooks/useKeyboardDismiss';
import { DiagnosticsPanel } from './DiagnosticsPanel';
import { MoviHelpBubble } from './help/MoviHelpBubble';
import { colors, typography } from '../theme';

type Props = { children: ReactNode };

function NavigationKeyboardGuard({ children }: Props) {
  useKeyboardDismissOnNavigate();
  return <>{children}</>;
}

type BoundaryState = { hasError: boolean; message: string };

class DiagnosticsErrorBoundary extends Component<Props, BoundaryState> {
  state: BoundaryState = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): BoundaryState {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (!isDevDiagnosticsEnabled()) return;
    const wrapped = new Error(error.message);
    wrapped.stack = info.componentStack ?? error.stack;
    logDiagnostic({ error: wrapped, route: 'error-boundary' });
  }

  render() {
    if (this.state.hasError) {
      return null;
    }
    return this.props.children;
  }
}

function DiagnosticRouteLogger({ children }: Props) {
  const pathname = usePathname();
  const { user } = useAuth();

  if (__DEV__) {
    void pathname;
    void user;
  }

  return <>{children}</>;
}

/** Burbuja flotante movible Aprende MOVI */
function FloatingHelpBubble() {
  return <MoviHelpBubble />;
}

/** Botón flotante para volver a mostrar la ayuda cuando está oculta. */
function FloatingHelpRestore() {
  const insets = useSafeAreaInsets();
  const { visible, show } = useHelpVisibility();

  if (visible) return null;

  return (
    <TouchableOpacity
      style={[styles.floatingHelp, { bottom: insets.bottom + 16, right: insets.right + 16 }]}
      onPress={show}
      accessibilityLabel="Mostrar ayuda MOVI"
      activeOpacity={0.85}
    >
      <Text style={styles.floatingHelpIcon}>?</Text>
    </TouchableOpacity>
  );
}

function AppShellInner({ children }: Props) {
  return (
    <DiagnosticsErrorBoundary>
      <NavigationKeyboardGuard>
        <DiagnosticRouteLogger>
          <View style={styles.root}>
            {children}
            <FloatingHelpBubble />
            <FloatingHelpRestore />
          </View>
          {isDevDiagnosticsEnabled() ? <DiagnosticsPanel /> : null}
        </DiagnosticRouteLogger>
      </NavigationKeyboardGuard>
    </DiagnosticsErrorBoundary>
  );
}

export function AppShell({ children }: Props) {
  return (
    <HelpVisibilityProvider>
      <AppShellInner>{children}</AppShellInner>
    </HelpVisibilityProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  floatingHelpWrap: {
    position: 'absolute',
    zIndex: 1000,
  },
  floatingHelp: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 1000,
  },
  floatingHelpIcon: {
    ...typography.label,
    color: colors.primaryText,
    fontWeight: '700',
    fontSize: 18,
  },
});

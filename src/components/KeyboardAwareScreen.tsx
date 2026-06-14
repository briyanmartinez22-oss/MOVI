import { type ReactNode } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableWithoutFeedback,
  View,
  type ScrollViewProps,
  type ViewStyle,
} from 'react-native';

type Props = {
  children: ReactNode;
  style?: ViewStyle;
  scroll?: boolean;
  scrollProps?: ScrollViewProps;
  /** padding extra para iOS cuando el teclado está abierto */
  keyboardVerticalOffset?: number;
};

/**
 * Comportamiento tipo Uber: cierra teclado al tocar fuera o al deslizar ScrollView.
 */
export function KeyboardAwareScreen({
  children,
  style,
  scroll = false,
  scrollProps,
  contentContainerStyle,
  keyboardVerticalOffset = Platform.OS === 'ios' ? 64 : 0,
}: Props & { contentContainerStyle?: ScrollViewProps['contentContainerStyle'] }) {
  const dismiss = () => Keyboard.dismiss();

  const inner = scroll ? (
    <ScrollView
      {...scrollProps}
      style={[styles.flex, scrollProps?.style]}
      contentContainerStyle={[styles.scrollContent, contentContainerStyle, scrollProps?.contentContainerStyle]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      onScrollBeginDrag={dismiss}
      showsVerticalScrollIndicator={scrollProps?.showsVerticalScrollIndicator ?? false}
    >
      {children}
    </ScrollView>
  ) : (
    children
  );

  return (
    <KeyboardAvoidingView
      style={[styles.flex, style]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={keyboardVerticalOffset}
    >
      <TouchableWithoutFeedback onPress={dismiss} accessible={false}>
        <View style={styles.flex}>{inner}</View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1 },
});

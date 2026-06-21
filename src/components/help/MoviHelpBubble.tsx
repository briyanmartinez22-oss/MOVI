import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { resolveHelpContext } from '../../data/helpContextDetails';
import { useHelpVisibility } from '../../context/HelpVisibilityContext';
import { MoviHelpModal } from './MoviHelpModal';
import { colors, typography } from '../../theme';

const STORAGE_KEY = 'movi_help_bubble_position_v1';
const BUBBLE_W = 52;
const BUBBLE_H = 52;

const HIDDEN_PREFIXES = ['/learn', '/legal', '/dev'];

type Pos = { x: number; y: number };

export function MoviHelpBubble() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { visible } = useHelpVisibility();
  const [modalOpen, setModalOpen] = useState(false);
  const [ready, setReady] = useState(false);

  const screen = Dimensions.get('window');
  const defaultX = screen.width - BUBBLE_W - 16 - insets.right;
  const defaultY = screen.height - BUBBLE_H - 80 - insets.bottom;

  const [pos, setPos] = useState<Pos>({ x: defaultX, y: defaultY });
  const posRef = useRef<Pos>({ x: defaultX, y: defaultY });
  const dragOrigin = useRef<Pos>({ x: defaultX, y: defaultY });

  posRef.current = pos;

  const clamp = useCallback(
    (x: number, y: number): Pos => {
      const minX = 8 + insets.left;
      const maxX = screen.width - BUBBLE_W - 8 - insets.right;
      const minY = 8 + insets.top;
      const maxY = screen.height - BUBBLE_H - 8 - insets.bottom;
      return {
        x: Math.min(maxX, Math.max(minX, x)),
        y: Math.min(maxY, Math.max(minY, y)),
      };
    },
    [insets, screen.width, screen.height]
  );

  useEffect(() => {
    void (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as Pos;
          setPos(clamp(parsed.x, parsed.y));
        } else {
          setPos({ x: defaultX, y: defaultY });
        }
      } catch {
        setPos({ x: defaultX, y: defaultY });
      }
      setReady(true);
    })();
  }, [clamp, defaultX, defaultY]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 6 || Math.abs(g.dy) > 6,
      onPanResponderGrant: () => {
        dragOrigin.current = posRef.current;
      },
      onPanResponderMove: (_, g) => {
        setPos(clamp(dragOrigin.current.x + g.dx, dragOrigin.current.y + g.dy));
      },
      onPanResponderRelease: (_, g) => {
        const next = clamp(dragOrigin.current.x + g.dx, dragOrigin.current.y + g.dy);
        setPos(next);
        void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      },
    })
  ).current;

  if (!visible || !ready) return null;
  if (HIDDEN_PREFIXES.some((p) => pathname.startsWith(p))) return null;

  const context = resolveHelpContext(pathname);

  return (
    <>
      <View
        style={[styles.bubble, { left: pos.x, top: pos.y }]}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity
          style={styles.touch}
          onPress={() => setModalOpen(true)}
          activeOpacity={0.85}
          accessibilityLabel="Aprende MOVI"
        >
          <Text style={styles.icon}>?</Text>
          <Text style={styles.label}>Aprende</Text>
        </TouchableOpacity>
      </View>
      <MoviHelpModal visible={modalOpen} context={context} onClose={() => setModalOpen(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  bubble: {
    position: 'absolute',
    zIndex: 1100,
    width: BUBBLE_W,
    height: BUBBLE_H,
  },
  touch: {
    width: BUBBLE_W,
    height: BUBBLE_H,
    borderRadius: BUBBLE_W / 2,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },
  icon: {
    ...typography.caption,
    color: colors.primaryText,
    fontWeight: '800',
    fontSize: 14,
    lineHeight: 16,
  },
  label: {
    fontSize: 9,
    color: colors.primaryText,
    fontWeight: '600',
    marginTop: -2,
  },
});

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

type HelpVisibilityContextValue = {
  visible: boolean;
  hide: () => void;
  show: () => void;
};

const HelpVisibilityContext = createContext<HelpVisibilityContextValue | null>(null);

export function HelpVisibilityProvider({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(true);

  const hide = useCallback(() => setVisible(false), []);
  const show = useCallback(() => setVisible(true), []);

  const value = useMemo(() => ({ visible, hide, show }), [visible, hide, show]);

  return (
    <HelpVisibilityContext.Provider value={value}>{children}</HelpVisibilityContext.Provider>
  );
}

export function useHelpVisibility(): HelpVisibilityContextValue {
  const ctx = useContext(HelpVisibilityContext);
  if (!ctx) {
    throw new Error('useHelpVisibility must be used within HelpVisibilityProvider');
  }
  return ctx;
}

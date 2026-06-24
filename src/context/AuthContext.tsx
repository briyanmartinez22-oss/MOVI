import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { AuthUser, DailySessionSummary, DriverSession, UserRole } from '../types/models';
import * as api from '../services/mockApi';
import * as authService from '../services/authService';
import { useMockApi } from '../services/api/config';
import {
  formatDuration,
  formatTime,
  getAllSessionsByDriver,
  getActiveSession,
  getDriverByUserId,
  refreshDriverSessions,
  refreshProfilesFromApi,
} from '../services/profileData';
import { loadStore, setCurrentUser } from '../services/mockStore';

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  requestOtp: (phone: string) => Promise<{ ok: boolean; error?: string }>;
  verifyOtp: (phone: string, code: string) => Promise<{ ok: boolean; isNewUser?: boolean; existingRole?: string | null; error?: string }>;
  login: (phone: string, dui: string | undefined, code: string) => Promise<{ ok: boolean; error?: string }>;
  loginWithPassword: (phone: string, password: string) => Promise<{ ok: boolean; error?: string; code?: string; user?: AuthUser }>;
  loginWithOtpAdmin: (phone: string, dui: string, code: string) => Promise<{ ok: boolean; error?: string }>;
  forgotPassword: (phone: string) => Promise<{ ok: boolean; error?: string }>;
  resetPassword: (phone: string, code: string, password: string, confirmPassword: string) => Promise<{ ok: boolean; error?: string }>;
  setInitialPassword: (phone: string, code: string, password: string, confirmPassword: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
  refresh: () => void;
  bootstrap: () => Promise<void>;
  registerPassenger: (phone: string, fullName: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  registerOwner: (
    phone: string,
    firstName: string,
    lastName: string,
    dui: string,
    password: string,
    email?: string,
    documentType?: 'DUI' | 'LICENSE'
  ) => Promise<{ ok: boolean; error?: string }>;
  registerDriverWithCode: (input: {
    phone: string;
    firstName: string;
    lastName: string;
    email?: string;
    birthDate?: string;
    code: string;
    licenseFront: string;
    licenseBack: string;
    password: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  getDailySessionSummary: (driverId: string) => DailySessionSummary;
  getAllDriverSessions: (driverId: string) => DriverSession[];
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(() => {
    const { user: current } = api.resolveCurrentProfiles();
    setUser(current);
  }, []);

  const bootstrap = useCallback(async () => {
    setIsLoading(true);
    try {
      if (useMockApi()) {
        await loadStore();
      }
      const session = await authService.loadSession();
      if (session?.user) {
        if (useMockApi()) {
          const storeUser = (await import('../services/mockStore')).getStore().users.find(
            (u) => u.userId === session.user.userId
          ) ?? null;
          if (storeUser) {
            setCurrentUser(storeUser.userId);
            setUser(storeUser);
          } else {
            await authService.logout();
            setUser(null);
          }
        } else {
          setUser(session.user);
          await refreshProfilesFromApi();
          void import('../services/pushNotificationService').then((m) => m.syncPushTokenAfterAuth());
        }
      } else {
        refresh();
      }
    } catch {
      try {
        await authService.logout();
      } catch {
        /* ignore secondary cleanup errors */
      }
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, [refresh]);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  const requestOtp = useCallback(async (phone: string) => {
    const res = await api.requestOtp(phone);
    if (!res.ok || !res.data?.sent) {
      return { ok: false, error: res.error ?? 'No se pudo enviar OTP' };
    }
    return { ok: true, sent: true };
  }, []);

  const verifyOtp = useCallback(async (phone: string, code: string) => {
    const res = await api.verifyOtp(phone, code);
    return res.ok
      ? { ok: true, isNewUser: res.data?.isNewUser, existingRole: res.data?.existingRole ?? null }
      : { ok: false, error: res.error };
  }, []);

  const login = useCallback(async (phone: string, dui: string | undefined, code: string) => {
    const res = await api.loginWithOtp(phone, dui, code);
    if (res.ok && res.data) {
      setUser(res.data);
      if (!useMockApi()) await refreshProfilesFromApi();
      return { ok: true };
    }
    return { ok: false, error: res.error };
  }, []);

  const loginWithPassword = useCallback(async (phone: string, password: string) => {
    const res = await api.loginWithPassword(phone, password);
    if (res.ok && res.data) {
      setUser(res.data);
      if (!useMockApi()) await refreshProfilesFromApi();
      return { ok: true, user: res.data };
    }
    return { ok: false, error: res.error, code: res.code };
  }, []);

  const loginWithOtpAdmin = useCallback(async (phone: string, dui: string, code: string) => {
    const res = await api.loginWithOtpAdmin(phone, dui, code);
    if (res.ok && res.data) {
      setUser(res.data);
      if (!useMockApi()) await refreshProfilesFromApi();
      return { ok: true };
    }
    return { ok: false, error: res.error };
  }, []);

  const forgotPassword = useCallback(async (phone: string) => {
    const res = await api.forgotPassword(phone);
    return res.ok ? { ok: true } : { ok: false, error: res.error };
  }, []);

  const resetPassword = useCallback(
    async (phone: string, code: string, password: string, confirmPassword: string) => {
      const res = await api.resetPassword(phone, code, password, confirmPassword);
      return res.ok ? { ok: true } : { ok: false, error: res.error };
    },
    []
  );

  const setInitialPassword = useCallback(
    async (phone: string, code: string, password: string, confirmPassword: string) => {
      const res = await api.setInitialPassword(phone, code, password, confirmPassword);
      if (res.ok && res.data) {
        setUser(res.data);
        if (!useMockApi()) await refreshProfilesFromApi();
        return { ok: true };
      }
      return { ok: false, error: res.error };
    },
    []
  );

  const logout = useCallback(async () => {
    await authService.logout();
    setUser(null);
  }, []);

  const registerPassenger = useCallback(async (phone: string, fullName: string, password: string) => {
    const res = await api.registerPassenger(phone, fullName, password);
    if (res.ok && res.data) {
      setUser(res.data);
      return { ok: true };
    }
    return { ok: false, error: res.error };
  }, []);

  const registerOwner = useCallback(
    async (
      phone: string,
      firstName: string,
      lastName: string,
      dui: string,
      password: string,
      email?: string,
      documentType?: 'DUI' | 'LICENSE'
    ) => {
      const res = await api.registerOwner(phone, firstName, lastName, dui, password, email, documentType);
      if (res.ok && res.data) {
        setUser(res.data.user);
        return { ok: true };
      }
      return { ok: false, error: res.error };
    },
    []
  );

  const registerDriverWithCode = useCallback(
    async (input: {
      phone: string;
      firstName: string;
      lastName: string;
      email?: string;
      birthDate?: string;
      code: string;
      licenseFront: string;
      licenseBack: string;
      password: string;
    }) => {
      const res = await api.registerDriverWithInvite(input);
      if (res.ok && res.data) {
        setUser(res.data.user);
        return { ok: true };
      }
      return { ok: false, error: res.error };
    },
    []
  );

  const getDailySessionSummary = useCallback((driverId: string): DailySessionSummary => {
    const today = new Date().toISOString().slice(0, 10);
    const driver = getDriverByUserId(user?.userId ?? '') ?? { id: driverId, name: 'Conductor' };
    const allSessions = getAllSessionsByDriver(driverId).filter(
      (s) => s.connectedAt.slice(0, 10) === today
    );
    const active = getActiveSession(driverId);
    const sessions =
      active && !allSessions.find((s) => s.sessionId === active.sessionId)
        ? [...allSessions, active]
        : allSessions;

    const totalMinutes = sessions.reduce((acc, s) => acc + (s.durationMinutes ?? 0), 0);

    return {
      driverId,
      driverName: driver.name ?? 'Conductor',
      date: today,
      sessions,
      connectionCount: sessions.length,
      disconnectionCount: sessions.filter((s) => s.disconnectedAt).length,
      totalHours: Math.round((totalMinutes / 60) * 10) / 10,
      totalTrips: sessions.reduce((acc, s) => acc + s.totalTrips, 0),
      totalKm: sessions.reduce((acc, s) => acc + s.totalKm, 0),
      totalCashCollected: sessions.reduce((acc, s) => acc + s.totalCashCollected, 0),
      isCurrentlyOnline: !!active,
    };
  }, [user?.userId]);

  const getAllDriverSessions = useCallback((driverId: string) => {
    if (!useMockApi()) void refreshDriverSessions(driverId);
    return getAllSessionsByDriver(driverId);
  }, []);

  const value = useMemo(
    () => ({
      user,
      isLoading,
      requestOtp,
      verifyOtp,
      login,
      loginWithPassword,
      loginWithOtpAdmin,
      forgotPassword,
      resetPassword,
      setInitialPassword,
      logout,
      refresh,
      bootstrap,
      registerPassenger,
      registerOwner,
      registerDriverWithCode,
      getDailySessionSummary,
      getAllDriverSessions,
    }),
    [
      user,
      isLoading,
      requestOtp,
      verifyOtp,
      login,
      loginWithPassword,
      loginWithOtpAdmin,
      forgotPassword,
      resetPassword,
      setInitialPassword,
      logout,
      refresh,
      bootstrap,
      registerPassenger,
      registerOwner,
      registerDriverWithCode,
      getDailySessionSummary,
      getAllDriverSessions,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export { formatDuration, formatTime };

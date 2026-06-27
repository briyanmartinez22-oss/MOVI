import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthUser } from '../types/models';
import { useMockApi } from '../config/env';
import { apiGet, apiPost } from './api/client';
import { getCurrentUser, getStore, saveStore, setCurrentUser, updateStore } from './mockStore';
import { clearProfileCache, setProfileCache } from './profileCache';
import { resetProfileHydration } from './profileHydration';
import { resolveProfilePhotoUrl } from '../utils/profilePhoto';
import { realtimeClient } from './realtimeClient';
import { syncPushTokenAfterAuth } from './pushNotificationService';

export const SESSION_KEYS = {
  currentUser: 'movi_session_currentUser',
  authToken: 'movi_session_authToken',
  refreshToken: 'movi_session_refreshToken',
  role: 'movi_session_role',
  phoneNumber: 'movi_session_phoneNumber',
} as const;

export interface AuthSession {
  user: AuthUser;
  authToken: string;
  role: string;
  phoneNumber: string;
}

export async function persistSession(
  user: AuthUser,
  authToken?: string,
  refreshToken?: string
): Promise<void> {
  const token = authToken ?? `mock-token-${user.userId}-${Date.now()}`;
  const pairs: [string, string][] = [
    [SESSION_KEYS.currentUser, JSON.stringify(user)],
    [SESSION_KEYS.authToken, token],
    [SESSION_KEYS.role, user.role],
    [SESSION_KEYS.phoneNumber, user.phoneNumber],
  ];
  if (refreshToken) pairs.push([SESSION_KEYS.refreshToken, refreshToken]);
  await AsyncStorage.multiSet(pairs);
  setProfileCache({ user });

  if (useMockApi()) {
    setCurrentUser(user.userId);
  } else {
    void fetchAndCacheProfiles();
    void realtimeClient.connect();
    void syncPushTokenAfterAuth();
  }
}

async function fetchAndCacheProfiles(): Promise<void> {
  const res = await apiGet<{
    user: AuthUser;
    owner: import('../types/models').Owner | null;
    driver: import('../types/models').DriverProfileRecord | null;
    business: import('../types/models').BusinessProfile | null;
  }>('/users/me/profiles');
  if (res.ok && res.data) {
    setProfileCache({
      user: res.data.user
        ? {
            ...res.data.user,
            profilePhoto: resolveProfilePhotoUrl(res.data.user.profilePhoto),
          }
        : res.data.user,
      owner: res.data.owner,
      driver: res.data.driver,
      business: res.data.business,
    });
  }
}

export async function loadSession(): Promise<AuthSession | null> {
  const [[, currentUserRaw], [, authToken], [, role], [, phoneNumber]] =
    await AsyncStorage.multiGet([
      SESSION_KEYS.currentUser,
      SESSION_KEYS.authToken,
      SESSION_KEYS.role,
      SESSION_KEYS.phoneNumber,
    ]);

  if (!currentUserRaw) return null;

  try {
    const storedUser = JSON.parse(currentUserRaw) as AuthUser;

    if (!useMockApi() && authToken) {
      const me = await apiGet<AuthUser>('/auth/me');
      if (!me.ok || !me.data) return null;
      const normalizedUser = {
        ...me.data,
        profilePhoto: resolveProfilePhotoUrl(me.data.profilePhoto),
      };
      setProfileCache({ user: normalizedUser });
      await AsyncStorage.setItem(SESSION_KEYS.currentUser, JSON.stringify(normalizedUser));
      await fetchAndCacheProfiles();
      return {
        user: normalizedUser,
        authToken,
        role: normalizedUser.role,
        phoneNumber: normalizedUser.phoneNumber,
      };
    }

    return {
      user: storedUser,
      authToken: authToken ?? '',
      role: role ?? storedUser.role,
      phoneNumber: phoneNumber ?? storedUser.phoneNumber,
    };
  } catch {
    return null;
  }
}

export async function logout(): Promise<void> {
  if (!useMockApi()) {
    const refreshToken = await AsyncStorage.getItem(SESSION_KEYS.refreshToken);
    if (refreshToken) {
      await apiPost('/auth/logout', { refreshToken }, { auth: false }).catch(() => undefined);
    }
    realtimeClient.disconnect();
    clearProfileCache();
    resetProfileHydration();
  }

  await AsyncStorage.multiRemove([
    SESSION_KEYS.currentUser,
    SESSION_KEYS.authToken,
    SESSION_KEYS.refreshToken,
    SESSION_KEYS.role,
    SESSION_KEYS.phoneNumber,
  ]);

  setCurrentUser(null);
  updateStore((store) => ({
    ...store,
    currentUserId: null,
    otpPhone: null,
  }));
  await saveStore(getStore());
}

export function getAuthenticatedUser(): AuthUser | null {
  if (useMockApi()) return getCurrentUser();
  return null;
}

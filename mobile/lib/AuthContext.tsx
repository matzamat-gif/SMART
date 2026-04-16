import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { isTokenValid, clearAuthStorage, setAuthInvalidatedHandler } from './api';
import { logger } from './logger';
import { User } from './types';
import {
  registerForPushNotificationsAsync,
  syncPushTokenWithBackend,
  scheduleMorningOutfitReminder,
  addNotificationResponseListener,
} from './notifications';

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (token: string, user: User) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadFromStorage = useCallback(async () => {
    try {
      const [storedToken, storedUser] = await Promise.all([
        AsyncStorage.getItem('authToken'),
        AsyncStorage.getItem('user'),
      ]);

      if (storedToken && isTokenValid(storedToken)) {
        setToken(storedToken);
        if (storedUser) {
          try {
            setUser(JSON.parse(storedUser));
          } catch {
            setUser(null);
          }
        }
      } else if (storedToken) {
        // Invalid/expired — clean it up.
        await clearAuthStorage();
        setToken(null);
        setUser(null);
      }
    } catch (error) {
      logger.error('Failed to load auth from storage');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  const signOut = useCallback(async () => {
    await clearAuthStorage();
    setToken(null);
    setUser(null);
    try {
      router.replace('/auth/login');
    } catch {
      // router may not be ready in some test contexts
    }
  }, []);

  // When the API layer detects an invalidated session (401 or expired
  // token), bounce the user back to login.
  useEffect(() => {
    setAuthInvalidatedHandler(() => {
      signOut();
    });
    return () => setAuthInvalidatedHandler(null);
  }, [signOut]);

  // Once authenticated, make sure the push token is registered with the
  // backend so morning outfit notifications can be delivered. We also
  // schedule the local "morning reminder" as a fallback.
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        await registerForPushNotificationsAsync();
        if (cancelled) return;
        await syncPushTokenWithBackend();
        await scheduleMorningOutfitReminder(7, 0);
      } catch {
        // non-fatal
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  // Route the user to the right screen when they tap a notification.
  useEffect(() => {
    const unsubscribe = addNotificationResponseListener((data) => {
      try {
        if (typeof data?.route === 'string' && data.route.startsWith('/')) {
          router.push(data.route as any);
          return;
        }
        if (data?.postId != null) {
          router.push(`/social/post/${data.postId}` as any);
          return;
        }
        // Default: open today screen.
        router.push('/(tabs)/today' as any);
      } catch {
        // ignore navigation errors
      }
    });
    return unsubscribe;
  }, []);

  const signIn = useCallback(async (newToken: string, newUser: User) => {
    await AsyncStorage.setItem('authToken', newToken);
    await AsyncStorage.setItem('user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  }, []);

  const refreshUser = useCallback(async () => {
    const storedUser = await AsyncStorage.getItem('user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        // ignore
      }
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isLoading,
      isAuthenticated: !!token && !!user,
      signIn,
      signOut,
      refreshUser,
    }),
    [user, token, isLoading, signIn, signOut, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}

/**
 * Convenience hook for components that don't need auth actions, only the
 * current user id (e.g. for ownership checks like "did I post this?").
 */
export function useCurrentUserId(): number | null {
  const { user } = useAuth();
  return user?.id ?? null;
}

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut as firebaseSignOut } from 'firebase/auth';
import { auth, googleAuthProvider } from '../lib/firebase';
import { apiFetch, setMemoryAuthToken } from '../lib/api';
import type { UserProfile, UserRole } from '../types';

interface AuthContextValue {
  user: UserProfile | null;
  loading: boolean;
  unreadNotifications: number;
  setUnreadNotifications: React.Dispatch<React.SetStateAction<number>>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  registerWithEmail: (input: {
    name: string;
    email: string;
    password: string;
    role: UserRole;
    hostCountry?: string;
    countryOfOrigin?: string;
    companyName?: string;
    organization?: string;
  }) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginAsDemo: (role: UserRole) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  const refreshProfile = useCallback(async () => {
    try {
      const data = await apiFetch<{ user: UserProfile; unreadNotifications: number }>('/api/auth/me');
      setUser(data.user);
      setUnreadNotifications(data.unreadNotifications);
    } catch {
      setUser(null);
      setUnreadNotifications(0);
    }
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        try {
          const idToken = await fbUser.getIdToken();
          setMemoryAuthToken(idToken);
          await refreshProfile();
        } catch {
          setLoading(false);
        }
      }
      setLoading(false);
    });
    return () => unsub();
  }, [refreshProfile]);

  const loginWithEmail = async (email: string, password: string) => {
    const data = await apiFetch<{ token: string; user: UserProfile }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setMemoryAuthToken(data.token);
    setUser(data.user);
    await refreshProfile();
  };

  const registerWithEmail = async (input: {
    name: string;
    email: string;
    password: string;
    role: UserRole;
    hostCountry?: string;
    countryOfOrigin?: string;
    companyName?: string;
    organization?: string;
  }) => {
    const data = await apiFetch<{ token: string; user: UserProfile }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    setMemoryAuthToken(data.token);
    setUser(data.user);
    await refreshProfile();
  };

  const loginWithGoogle = async () => {
    const cred = await signInWithPopup(auth, googleAuthProvider);
    const idToken = await cred.user.getIdToken();
    setMemoryAuthToken(idToken);
    await refreshProfile();
  };

  const loginAsDemo = async (role: UserRole) => {
    const data = await apiFetch<{ token: string; user: UserProfile }>('/api/auth/demo-login', {
      method: 'POST',
      body: JSON.stringify({ role }),
    });
    setMemoryAuthToken(data.token);
    setUser(data.user);
    await refreshProfile();
  };

  const logout = async () => {
    setMemoryAuthToken(null);
    setUser(null);
    setUnreadNotifications(0);
    try {
      await firebaseSignOut(auth);
    } catch {
      // Ignore if not signed into Firebase
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        unreadNotifications,
        setUnreadNotifications,
        loginWithEmail,
        registerWithEmail,
        loginWithGoogle,
        loginAsDemo,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

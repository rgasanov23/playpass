"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { fetchMe } from "@/lib/api";
import { clearStoredToken, readStoredToken, writeStoredToken } from "@/lib/auth";
import type { AuthUser } from "@/types/auth";

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  token: string | null;
  setSession: (token: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadFromStorage = useCallback(async () => {
    const t = readStoredToken();
    if (!t) {
      setToken(null);
      setUser(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const me = await fetchMe(t);
      setToken(t);
      setUser(me);
    } catch {
      clearStoredToken();
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadFromStorage();
  }, [loadFromStorage]);

  const setSession = useCallback(async (newToken: string) => {
    setLoading(true);
    try {
      const me = await fetchMe(newToken);
      writeStoredToken(newToken);
      setToken(newToken);
      setUser(me);
    } catch (e) {
      clearStoredToken();
      setToken(null);
      setUser(null);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    clearStoredToken();
    setToken(null);
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const t = readStoredToken();
    if (!t) {
      setUser(null);
      setToken(null);
      return;
    }
    try {
      const me = await fetchMe(t);
      setToken(t);
      setUser(me);
    } catch {
      clearStoredToken();
      setToken(null);
      setUser(null);
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      token,
      setSession,
      logout,
      refreshUser,
    }),
    [user, loading, token, setSession, logout, refreshUser],
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}

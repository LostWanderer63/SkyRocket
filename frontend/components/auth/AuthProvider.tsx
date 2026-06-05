"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { User } from "@/lib/types";
import { getToken, setToken, me as fetchMe } from "@/lib/api";

interface AuthState {
  user: User | null;
  loading: boolean;
  signedIn: boolean;
  setSession: (user: User, token: string, remember?: boolean) => void;
  logout: () => void;
}

const AuthCtx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore session from a stored token on first load.
  useEffect(() => {
    if (!getToken()) {
      setLoading(false);
      return;
    }
    fetchMe()
      .then((r) => setUser(r.user))
      .catch(() => setToken(null))
      .finally(() => setLoading(false));
  }, []);

  function setSession(u: User, token: string, remember = true) {
    setToken(token, remember);
    setUser(u);
  }
  function logout() {
    setToken(null);
    setUser(null);
  }

  return (
    <AuthCtx.Provider value={{ user, loading, signedIn: !!user, setSession, logout }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

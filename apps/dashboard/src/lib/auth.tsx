'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

type User = { id: string; displayName: string; role: string };

type AuthCtx = {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (githubId?: string, displayName?: string) => Promise<void>;
  logout: () => void;
};

const Ctx = createContext<AuthCtx | null>(null);

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const t = localStorage.getItem('ghc.token');
    const u = localStorage.getItem('ghc.user');
    if (t && u) {
      setToken(t);
      setUser(JSON.parse(u));
    }
  }, []);

  const login = useCallback(async (githubId = 'leader-1', displayName = 'Team Leader') => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/dev-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ githubId, displayName, role: 'LEADER' }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setToken(data.accessToken);
      setUser(data.developer);
      localStorage.setItem('ghc.token', data.accessToken);
      localStorage.setItem('ghc.user', JSON.stringify(data.developer));
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('ghc.token');
    localStorage.removeItem('ghc.user');
  }, []);

  const value = useMemo(
    () => ({ user, token, loading, login, logout }),
    [user, token, loading, login, logout],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('AuthProvider missing');
  return ctx;
}

export function useApi() {
  const { token } = useAuth();
  return useCallback(
    async (path: string, init?: RequestInit) => {
      const res = await fetch(`${API}${path}`, {
        ...init,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(init?.headers ?? {}),
        },
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    [token],
  );
}

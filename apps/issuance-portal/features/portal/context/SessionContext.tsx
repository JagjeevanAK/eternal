"use client";

import {
  createContext,
  type ReactNode,
  startTransition,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { apiFetch, getStoredSessionToken, setStoredSessionToken } from "@/lib/product-api";
import type { DemoUser, SessionUser } from "@/features/portal/types";

interface SessionContextValue {
  token: string | null;
  user: SessionUser | null;
  loading: boolean;
  demoUsers: DemoUser[];
  requestOtp: (
    identifier: string,
  ) => Promise<{
    challengeId: string;
    destination: string;
    codeHint: string;
    deliveryMode: "email" | "local";
  }>;
  signup: (fullName: string, email: string) => Promise<{ created: boolean; user: SessionUser }>;
  loginWithOtp: (identifier: string, code: string) => Promise<SessionUser>;
  refreshSession: () => Promise<void>;
  logout: () => Promise<void>;
  bindWallet: (address: string) => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [demoUsers, setDemoUsers] = useState<DemoUser[]>([]);

  const refreshSession = useCallback(async () => {
    const nextToken = getStoredSessionToken();
    if (!nextToken) {
      setToken(null);
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const response = await apiFetch<{ user: SessionUser }>("/session", { token: nextToken });
      startTransition(() => {
        setToken(nextToken);
        setUser(response.user);
        setLoading(false);
      });
    } catch {
      setStoredSessionToken(null);
      startTransition(() => {
        setToken(null);
        setUser(null);
        setLoading(false);
      });
    }
  }, []);

  useEffect(() => {
    const loadSession = async () => {
      setLoading(true);

      try {
        const response = await apiFetch<{ demoUsers: DemoUser[] }>("/seed-users");
        setDemoUsers(response.demoUsers);
      } catch {
        setDemoUsers([]);
      }

      await refreshSession();
    };

    void loadSession();
  }, [refreshSession]);

  const requestOtp = useCallback(async (identifier: string) => {
    return apiFetch<{
      challengeId: string;
      destination: string;
      codeHint: string;
      deliveryMode: "email" | "local";
    }>("/auth/otp", { method: "POST", body: { identifier } });
  }, []);

  const signup = useCallback(async (fullName: string, email: string) => {
    return apiFetch<{ created: boolean; user: SessionUser }>("/auth/signup", {
      method: "POST",
      body: { fullName, email },
    });
  }, []);

  const loginWithOtp = useCallback(async (identifier: string, code: string) => {
    const response = await apiFetch<{ token: string; user: SessionUser }>("/auth/verify", {
      method: "POST",
      body: { identifier, code },
    });

    setStoredSessionToken(response.token);
    startTransition(() => {
      setToken(response.token);
      setUser(response.user);
    });

    return response.user;
  }, []);

  const logout = useCallback(async () => {
    const currentToken = getStoredSessionToken();
    if (currentToken) {
      await apiFetch<{ ok: boolean }>("/auth/logout", { method: "POST", token: currentToken }).catch(
        () => undefined,
      );
    }

    setStoredSessionToken(null);
    startTransition(() => {
      setToken(null);
      setUser(null);
    });
  }, []);

  const bindWallet = useCallback(
    async (address: string) => {
      const currentToken = getStoredSessionToken();
      if (!currentToken) {
        return;
      }

      const response = await apiFetch<{ user: SessionUser }>("/wallets/bind", {
        method: "POST",
        token: currentToken,
        body: { address },
      });

      startTransition(() => {
        setUser(response.user);
      });
    },
    [],
  );

  const value = useMemo<SessionContextValue>(
    () => ({
      token,
      user,
      loading,
      demoUsers,
      requestOtp,
      signup,
      loginWithOtp,
      refreshSession,
      logout,
      bindWallet,
    }),
    [
      bindWallet,
      demoUsers,
      loading,
      loginWithOtp,
      logout,
      refreshSession,
      requestOtp,
      signup,
      token,
      user,
    ],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export const useSession = () => {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useSession must be used within SessionProvider.");
  }

  return context;
};

"use client";

import {
  createContext,
  type ReactNode,
  startTransition,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  apiFetch,
  getStoredSessionToken,
  setStoredSessionToken,
} from "@/lib/product-api";
import type { DemoUser, SessionUser } from "@/features/exchange/types";

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
  bindWallet: (address: string) => Promise<SessionUser>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [demoUsers, setDemoUsers] = useState<DemoUser[]>([]);

  async function refreshSession() {
    const currentToken = getStoredSessionToken();

    if (!currentToken) {
      startTransition(() => {
        setToken(null);
        setUser(null);
        setLoading(false);
      });
      return;
    }

    try {
      const response = await apiFetch<{ user: SessionUser }>("/session", {
        token: currentToken,
      });

      startTransition(() => {
        setToken(currentToken);
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
  }

  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      setLoading(true);

      try {
        const response = await apiFetch<{ demoUsers: DemoUser[] }>("/seed-users");
        if (!cancelled) {
          setDemoUsers(response.demoUsers);
        }
      } catch {
        if (!cancelled) {
          setDemoUsers([]);
        }
      }

      if (!cancelled) {
        await refreshSession();
      }
    }

    void loadSession();

    return () => {
      cancelled = true;
    };
  }, []);

  async function requestOtp(identifier: string) {
    return apiFetch<{
      challengeId: string;
      destination: string;
      codeHint: string;
      deliveryMode: "email" | "local";
    }>("/auth/otp", {
      method: "POST",
      body: { identifier },
    });
  }

  async function signup(fullName: string, email: string) {
    return apiFetch<{ created: boolean; user: SessionUser }>("/auth/signup", {
      method: "POST",
      body: { fullName, email },
    });
  }

  async function loginWithOtp(identifier: string, code: string) {
    const response = await apiFetch<{ token: string; user: SessionUser }>("/auth/verify", {
      method: "POST",
      body: { identifier, code },
    });

    setStoredSessionToken(response.token);
    startTransition(() => {
      setToken(response.token);
      setUser(response.user);
      setLoading(false);
    });

    return response.user;
  }

  async function logout() {
    const currentToken = getStoredSessionToken();

    if (currentToken) {
      await apiFetch<{ ok: boolean }>("/auth/logout", {
        method: "POST",
        token: currentToken,
      }).catch(() => undefined);
    }

    setStoredSessionToken(null);
    startTransition(() => {
      setToken(null);
      setUser(null);
      setLoading(false);
    });
  }

  async function bindWallet(address: string) {
    const currentToken = getStoredSessionToken();

    if (!currentToken) {
      throw new Error("You need to sign in before binding a wallet.");
    }

    const response = await apiFetch<{ user: SessionUser }>("/wallets/bind", {
      method: "POST",
      token: currentToken,
      body: { address },
    });

    startTransition(() => {
      setUser(response.user);
    });

    return response.user;
  }

  return (
    <SessionContext.Provider
      value={{
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
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export const useSession = () => {
  const context = useContext(SessionContext);

  if (!context) {
    throw new Error("useSession must be used within SessionProvider.");
  }

  return context;
};

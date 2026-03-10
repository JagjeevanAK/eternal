"use client";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:4000";
const STORAGE_KEY = "eternal.local.session-token";

interface ApiRequestOptions {
  method?: "GET" | "POST";
  token?: string | null;
  body?: unknown;
}

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export const getStoredSessionToken = () =>
  typeof window === "undefined" ? null : window.localStorage.getItem(STORAGE_KEY);

export const setStoredSessionToken = (token: string | null) => {
  if (typeof window === "undefined") {
    return;
  }

  if (token) {
    window.localStorage.setItem(STORAGE_KEY, token);
  } else {
    window.localStorage.removeItem(STORAGE_KEY);
  }
};

export const apiFetch = async <T>(
  path: string,
  { method = "GET", token, body }: ApiRequestOptions = {},
): Promise<T> => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      ...(body ? { "content-type": "application/json" } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => null)) as { error?: string } | null;

  if (!response.ok) {
    throw new ApiError(payload?.error ?? "Request failed.", response.status);
  }

  return payload as T;
};

export const resetLocalProductState = async () => {
  await apiFetch<{ ok: boolean }>("/reset", { method: "POST" });
  setStoredSessionToken(null);
};

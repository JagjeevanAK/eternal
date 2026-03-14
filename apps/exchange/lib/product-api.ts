"use client";

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:4000";
const STORAGE_KEY = "eternal.exchange.session-token";
const SHOULD_LOG_API_ACTIVITY = process.env.NODE_ENV !== "production";

interface ApiRequestOptions {
  method?: "GET" | "POST";
  token?: string | null;
  body?: FormData | Record<string, unknown>;
}

const describeApiBody = (body: ApiRequestOptions["body"]) => {
  if (!body) {
    return { type: "none" as const };
  }

  if (body instanceof FormData) {
    return {
      type: "form-data" as const,
      entries: Array.from(body.entries()).map(([key, value]) => ({
        key,
        value:
          typeof value === "string"
            ? value
            : {
                name: value.name,
                size: value.size,
                type: value.type,
              },
      })),
    };
  }

  return {
    type: "json" as const,
    keys: Object.keys(body),
  };
};

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
    return;
  }

  window.localStorage.removeItem(STORAGE_KEY);
};

export const apiFetch = async <T>(
  path: string,
  { method = "GET", token, body }: ApiRequestOptions = {},
): Promise<T> => {
  const isFormData = body instanceof FormData;

  if (SHOULD_LOG_API_ACTIVITY) {
    console.info("[exchange-api] request", {
      method,
      path,
      hasToken: Boolean(token),
      body: describeApiBody(body),
    });
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      ...(body && !isFormData ? { "content-type": "application/json" } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body ? (isFormData ? body : JSON.stringify(body)) : undefined,
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => null)) as { error?: string } | null;

  if (SHOULD_LOG_API_ACTIVITY) {
    console.info("[exchange-api] response", {
      method,
      path,
      status: response.status,
      ok: response.ok,
      error: payload?.error ?? null,
    });
  }

  if (!response.ok) {
    throw new ApiError(payload?.error ?? "Request failed.", response.status);
  }

  return payload as T;
};

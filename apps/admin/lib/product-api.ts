"use client";

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:4000";
const STORAGE_KEY = "eternal.local.session-token";
const SHOULD_LOG_API_ACTIVITY = process.env.NODE_ENV !== "production";

interface ApiRequestOptions {
  method?: "GET" | "POST";
  token?: string | null;
  body?: unknown;
}

const describeApiBody = (body: unknown) => {
  if (!body) {
    return { type: "none" as const };
  }

  if (typeof FormData !== "undefined" && body instanceof FormData) {
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

  if (typeof body === "object") {
    return {
      type: "json" as const,
      keys: Object.keys(body as Record<string, unknown>),
    };
  }

  return {
    type: typeof body,
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
  } else {
    window.localStorage.removeItem(STORAGE_KEY);
  }
};

export const apiFetch = async <T>(
  path: string,
  { method = "GET", token, body }: ApiRequestOptions = {},
): Promise<T> => {
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
  if (SHOULD_LOG_API_ACTIVITY) {
    console.info("[product-api] request", {
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
    console.info("[product-api] response", {
      method,
      path,
      status: response.status,
      ok: response.ok,
      error: payload?.error ?? null,
    });
  }

  if (!response.ok) {
    if (SHOULD_LOG_API_ACTIVITY) {
      console.error("[product-api] request failed", {
        method,
        path,
        status: response.status,
        error: payload?.error ?? "Request failed.",
      });
    }
    throw new ApiError(payload?.error ?? "Request failed.", response.status);
  }

  return payload as T;
};

export const openProtectedFile = async (path: string, token: string | null) => {
  if (!token) {
    throw new ApiError("Unauthorized.", 401);
  }

  if (SHOULD_LOG_API_ACTIVITY) {
    console.info("[product-api] open file request", {
      path,
      hasToken: true,
    });
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "GET",
    headers: {
      authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    if (SHOULD_LOG_API_ACTIVITY) {
      console.error("[product-api] open file failed", {
        path,
        status: response.status,
        error: payload?.error ?? "Request failed.",
      });
    }
    throw new ApiError(payload?.error ?? "Request failed.", response.status);
  }

  const blob = await response.blob();
  if (SHOULD_LOG_API_ACTIVITY) {
    console.info("[product-api] open file success", {
      path,
      status: response.status,
      size: blob.size,
      type: blob.type,
    });
  }
  const objectUrl = window.URL.createObjectURL(blob);
  const opened = window.open(objectUrl, "_blank", "noopener,noreferrer");

  if (!opened) {
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.target = "_blank";
    anchor.rel = "noreferrer";
    anchor.click();
  }

  window.setTimeout(() => {
    window.URL.revokeObjectURL(objectUrl);
  }, 60_000);
};

export const resetLocalProductState = async () => {
  await apiFetch<{ ok: boolean }>("/reset", { method: "POST" });
  setStoredSessionToken(null);
};

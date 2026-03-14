"use client";

const BOUND_WALLET_STORAGE_KEY = "eternal.exchange.bound-wallet";

export interface StoredBoundWallet {
  userId: string;
  walletName: string | null;
  address: string;
  boundAt: string;
}

export const getStoredBoundWallet = (): StoredBoundWallet | null => {
  if (typeof window === "undefined") {
    return null;
  }

  const rawValue = window.localStorage.getItem(BOUND_WALLET_STORAGE_KEY);
  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue) as StoredBoundWallet;
  } catch {
    window.localStorage.removeItem(BOUND_WALLET_STORAGE_KEY);
    return null;
  }
};

export const setStoredBoundWallet = (value: StoredBoundWallet | null) => {
  if (typeof window === "undefined") {
    return;
  }

  if (!value) {
    window.localStorage.removeItem(BOUND_WALLET_STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(BOUND_WALLET_STORAGE_KEY, JSON.stringify(value));
};

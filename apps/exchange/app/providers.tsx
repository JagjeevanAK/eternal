"use client";

import type { ReactNode } from "react";
import type { Adapter } from "@solana/wallet-adapter-base";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { SessionProvider } from "@/features/exchange/context/SessionContext";
import { SOLANA_RPC_URL } from "@/lib/solana-network";

const wallets: Adapter[] = [];

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ConnectionProvider endpoint={SOLANA_RPC_URL}>
      <WalletProvider
        wallets={wallets}
        autoConnect
        localStorageKey="eternal.exchange.wallet-name"
        onError={(error) => {
          console.error("[exchange-wallet]", error);
        }}
      >
        <WalletModalProvider>
          <SessionProvider>{children}</SessionProvider>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

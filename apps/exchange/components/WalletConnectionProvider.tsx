'use client';

import React, { FC, useEffect, useMemo, useState } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import type { Adapter } from '@solana/wallet-adapter-base';
import WalletModalProviderWrapper from '@/components/WalletModalProvider';
import { useHydrated } from '@/lib/useHydrated';
import {
  SOLANA_IS_LOCALNET,
  SOLANA_RPC_ENDPOINT,
  SOLANA_WALLET_NETWORK,
} from '@/lib/solana-network';

export const WalletConnectionProvider: FC<{ children: React.ReactNode }> = ({ children }) => {
  const endpoint = useMemo(() => SOLANA_RPC_ENDPOINT, []);
  const walletUiReady = useHydrated();
  const [wallets, setWallets] = useState<Adapter[]>([]);

  useEffect(() => {
    if (!walletUiReady) {
      setWallets([]);
      return;
    }

    let cancelled = false;

    const loadWallets = async () => {
      const { PhantomWalletAdapter, SolflareWalletAdapter } = await import(
        '@solana/wallet-adapter-wallets'
      );

      const availableWallets: Adapter[] = [new PhantomWalletAdapter()];

      if (!SOLANA_IS_LOCALNET) {
        availableWallets.push(new SolflareWalletAdapter({ network: SOLANA_WALLET_NETWORK }));
      }

      if (!cancelled) {
        setWallets(availableWallets);
      }
    };

    void loadWallets().catch(() => {
      if (!cancelled) {
        setWallets([]);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [walletUiReady]);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect={false}>
        <WalletModalProviderWrapper>{children}</WalletModalProviderWrapper>
      </WalletProvider>
    </ConnectionProvider>
  );
};

export default WalletConnectionProvider;

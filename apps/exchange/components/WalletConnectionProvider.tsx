'use client';

import React, { FC, useMemo } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import type { Adapter } from '@solana/wallet-adapter-base';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
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

  const wallets = useMemo(
    () => {
      if (!walletUiReady) {
        return [];
      }

      const availableWallets: Adapter[] = [new PhantomWalletAdapter()];

      if (!SOLANA_IS_LOCALNET) {
        availableWallets.push(
          new SolflareWalletAdapter({ network: SOLANA_WALLET_NETWORK })
        );
      }

      return availableWallets;
    },
    [walletUiReady]
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect={false}>
        <WalletModalProviderWrapper>{children}</WalletModalProviderWrapper>
      </WalletProvider>
    </ConnectionProvider>
  );
};

export default WalletConnectionProvider;

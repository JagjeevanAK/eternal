'use client';

import React, { FC, useMemo } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import type { Adapter } from '@solana/wallet-adapter-base';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import dynamic from 'next/dynamic';
import {
  SOLANA_IS_LOCALNET,
  SOLANA_RPC_ENDPOINT,
  SOLANA_WALLET_NETWORK,
} from '@/lib/solana-network';

const WalletModalProviderDynamic = dynamic(
  () => import('@solana/wallet-adapter-react-ui').then(mod => mod.WalletModalProvider),
  { ssr: false }
);

export const WalletConnectionProvider: FC<{ children: React.ReactNode }> = ({ children }) => {
  const endpoint = useMemo(() => SOLANA_RPC_ENDPOINT, []);

  const wallets = useMemo(
    () => {
      if (typeof window !== 'undefined') {
        const availableWallets: Adapter[] = [new PhantomWalletAdapter()];

        if (!SOLANA_IS_LOCALNET) {
          availableWallets.push(
            new SolflareWalletAdapter({ network: SOLANA_WALLET_NETWORK })
          );
        }

        return availableWallets;
      }
      return [];
    },
    []
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect={false}>
        <WalletModalProviderDynamic>{children}</WalletModalProviderDynamic>
      </WalletProvider>
    </ConnectionProvider>
  );
};

export default WalletConnectionProvider;

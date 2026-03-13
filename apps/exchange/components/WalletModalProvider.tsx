'use client';

import { type ComponentType, useEffect, useState } from 'react';
import type { WalletModalProviderProps } from '@solana/wallet-adapter-react-ui';

type WalletModalProviderWrapperProps = WalletModalProviderProps;

export default function WalletModalProviderWrapper({
  children,
  ...props
}: WalletModalProviderWrapperProps) {
  const [WalletModalProviderComponent, setWalletModalProviderComponent] =
    useState<ComponentType<WalletModalProviderProps> | null>(null);

  useEffect(() => {
    let cancelled = false;

    void import('@solana/wallet-adapter-react-ui')
      .then((module) => {
        if (!cancelled) {
          setWalletModalProviderComponent(() => module.WalletModalProvider);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setWalletModalProviderComponent(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (!WalletModalProviderComponent) {
    return <>{children}</>;
  }

  return <WalletModalProviderComponent {...props}>{children}</WalletModalProviderComponent>;
}

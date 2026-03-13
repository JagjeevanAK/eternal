'use client';

import type { ComponentProps, PropsWithChildren } from 'react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';

type WalletModalProviderWrapperProps = PropsWithChildren<ComponentProps<typeof WalletModalProvider>>;

export default function WalletModalProviderWrapper({
  children,
  ...props
}: WalletModalProviderWrapperProps) {
  return <WalletModalProvider {...props}>{children}</WalletModalProvider>;
}

'use client';

import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';

export default function WalletModalProviderWrapper({ children, ...props }: any) {
  return <WalletModalProvider {...props}>{children}</WalletModalProvider>;
}

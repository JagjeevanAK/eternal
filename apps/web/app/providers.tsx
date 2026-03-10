'use client';

import type { ReactNode } from 'react';
import WalletConnectionProvider from '@/components/WalletConnectionProvider';

interface ProvidersProps {
  children: ReactNode;
}

export default function Providers({ children }: ProvidersProps) {
  return <WalletConnectionProvider>{children}</WalletConnectionProvider>;
}

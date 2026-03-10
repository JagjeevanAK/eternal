'use client';

import type { ReactNode } from 'react';
import { ThemeProvider } from 'next-themes';
import WalletConnectionProvider from '@/components/WalletConnectionProvider';
import { SessionProvider } from '@/features/product/context/SessionContext';

interface ProvidersProps {
  children: ReactNode;
}

export default function Providers({ children }: ProvidersProps) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange={false}>
      <WalletConnectionProvider>
        <SessionProvider>{children}</SessionProvider>
      </WalletConnectionProvider>
    </ThemeProvider>
  );
}

'use client';

import type { ReactNode } from 'react';
import { ThemeProvider } from 'next-themes';
import WalletConnectionProvider from '@/components/WalletConnectionProvider';

interface ProvidersProps {
  children: ReactNode;
}

export default function Providers({ children }: ProvidersProps) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange={false}>
      <WalletConnectionProvider>{children}</WalletConnectionProvider>
    </ThemeProvider>
  );
}

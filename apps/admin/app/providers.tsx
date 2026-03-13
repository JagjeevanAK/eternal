'use client';

import type { ReactNode } from 'react';
import { ThemeProvider } from 'next-themes';
import { SessionProvider } from '@/features/admin/context/SessionContext';

interface ProvidersProps {
  children: ReactNode;
}

export default function Providers({ children }: ProvidersProps) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange={false}>
      <SessionProvider>{children}</SessionProvider>
    </ThemeProvider>
  );
}

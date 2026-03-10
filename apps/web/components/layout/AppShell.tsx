'use client';

import type { ReactNode } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NetworkBadge } from '@/components/layout/NetworkBadge';
import { cn } from '@/lib/utils';

const WalletMultiButton = dynamic(
  () => import('@solana/wallet-adapter-react-ui').then((mod) => mod.WalletMultiButton),
  { ssr: false }
);

const navigation = [
  {
    href: '/marketplace',
    label: 'Marketplace',
    matches: (pathname: string) =>
      pathname === '/marketplace' || pathname.startsWith('/asset/'),
  },
  {
    href: '/register',
    label: 'Register',
    matches: (pathname: string) => pathname === '/register',
  },
  {
    href: '/portfolio',
    label: 'Portfolio',
    matches: (pathname: string) => pathname === '/portfolio',
  },
  {
    href: '/admin',
    label: 'Admin',
    matches: (pathname: string) => pathname === '/admin',
  },
];

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-black text-white">
      <nav className="sticky top-0 z-50 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-4">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-xl font-semibold tracking-tight text-white">
              Eternal
            </Link>
            <NetworkBadge />
          </div>
          <div className="flex items-center gap-2">
            {navigation.map((item) => {
              const active = item.matches(pathname);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'rounded-lg px-4 py-2 text-sm transition-colors',
                    active
                      ? 'bg-white text-black'
                      : 'text-zinc-300 hover:bg-zinc-900 hover:text-white'
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
            <WalletMultiButton className="!rounded-lg !bg-white !text-sm !text-black hover:!bg-zinc-200" />
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}

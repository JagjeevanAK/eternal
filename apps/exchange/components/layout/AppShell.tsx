'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NetworkBadge } from '@/components/layout/NetworkBadge';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { useSession } from '@/features/product/context/SessionContext';
import { formatRole } from '@/features/product/lib/format';
import { cn } from '@/lib/utils';

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const { logout, user } = useSession();

  const navigation = [
    {
      href: '/dashboard',
      label: 'Dashboard',
      hidden: !user,
      matches: (value: string) => value === '/dashboard',
    },
    {
      href: '/marketplace',
      label: 'Marketplace',
      hidden: false,
      matches: (value: string) =>
        value === '/marketplace' ||
        value.startsWith('/marketplace/') ||
        value === '/properties' ||
        value.startsWith('/properties/'),
    },
    {
      href: '/portfolio',
      label: 'Portfolio',
      hidden: user?.role !== 'investor',
      matches: (value: string) => value === '/portfolio',
    },
    {
      href: '/orders',
      label: 'Orders',
      hidden: !user,
      matches: (value: string) => value === '/orders',
    },
    {
      href: '/payments',
      label: 'Payments',
      hidden: !user,
      matches: (value: string) => value === '/payments',
    },
    {
      href: '/documents',
      label: 'Documents',
      hidden: !user,
      matches: (value: string) => value === '/documents',
    },
  ].filter((item) => !item.hidden);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="sticky top-0 z-50 border-b border-border bg-card/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-xl font-semibold tracking-tight text-foreground">
              Eternal
            </Link>
            <NetworkBadge />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {navigation.map((item) => {
              const active = item.matches(pathname);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'rounded-lg px-4 py-2 text-sm transition-colors',
                    active
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
            {!user ? (
              <>
                <Link
                  href="/login#signup"
                  className="rounded-lg border border-border px-4 py-2 text-sm text-foreground transition-colors hover:bg-background"
                >
                  Sign Up
                </Link>
                <Link
                  href="/login"
                  className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground transition-opacity hover:opacity-90"
                >
                  Sign In
                </Link>
              </>
            ) : null}
            <ThemeToggle />
            <button
              type="button"
              disabled
              className="rounded-lg border border-border bg-background px-4 py-2 text-sm text-muted-foreground"
            >
              Wallet unavailable
            </button>
            {user ? (
              <>
                <div className="rounded-lg border border-border bg-background px-3 py-2 text-right">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{formatRole(user.role)}</p>
                  <p className="text-sm font-medium text-foreground">{user.fullName}</p>
                </div>
                <button
                  onClick={() => void logout()}
                  className="rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
                >
                  Log Out
                </button>
              </>
            ) : null}
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}

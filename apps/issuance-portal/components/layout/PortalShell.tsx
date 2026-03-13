'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { formatRole } from '@/features/portal/lib/format';
import { useSession } from '@/features/portal/context/SessionContext';
import { cn } from '@/lib/utils';

interface PortalShellProps {
  children: ReactNode;
}

export function PortalShell({ children }: PortalShellProps) {
  const pathname = usePathname();
  const { logout, user } = useSession();

  const navigation = [
    {
      href: '/',
      label: 'Overview',
      hidden: false,
      matches: (value: string) => value === '/',
    },
    {
      href: '/verification',
      label: 'Verification',
      hidden: user?.role !== 'investor',
      matches: (value: string) => value === '/verification',
    },
    {
      href: '/issuer',
      label: 'Issuer Desk',
      hidden: user?.role !== 'issuer',
      matches: (value: string) => value === '/issuer',
    },
    {
      href: '/issuer/review',
      label: 'Review Queue',
      hidden: user?.role !== 'issuer',
      matches: (value: string) => value === '/issuer/review',
    },
    {
      href: '/admin',
      label: 'Admin',
      hidden: user?.role !== 'admin',
      matches: (value: string) => value === '/admin',
    },
  ].filter((item) => !item.hidden);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="sticky top-0 z-50 border-b border-border bg-card/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-lg font-semibold tracking-tight text-foreground">
              Eternal Issuance
            </Link>
            <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              Local API
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {navigation.map((item) => {
              const active = item.matches(pathname);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'rounded-full px-4 py-2 text-sm transition-colors',
                    active
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
            {!user ? (
              <>
                <Link
                  href="/signup"
                  className="rounded-full border border-border px-4 py-2 text-sm text-foreground transition-colors hover:bg-background"
                >
                  Sign Up
                </Link>
                <Link
                  href="/login"
                  className="rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground transition-opacity hover:opacity-90"
                >
                  Sign In
                </Link>
              </>
            ) : null}
            <ThemeToggle />
            {user ? (
              <>
                <div className="rounded-2xl border border-border bg-background px-3 py-2 text-right">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{formatRole(user.role)}</p>
                  <p className="text-sm font-medium text-foreground">{user.fullName}</p>
                </div>
                <button
                  onClick={() => void logout()}
                  className="rounded-full border border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
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

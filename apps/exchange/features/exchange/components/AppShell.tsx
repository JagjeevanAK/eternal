"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FileText,
  LayoutDashboard,
  LogOut,
  Receipt,
  Search,
  ShieldCheck,
  WalletCards,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useSession } from "@/features/exchange/context/SessionContext";
import { formatRole, truncateAddress } from "@/features/exchange/lib/format";
import { StatusBadge } from "@/features/exchange/components/StatusBadge";
import { cn } from "@/lib/utils";

interface AppShellProps {
  children: ReactNode;
}

const navigation = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    requiresAuth: true,
    matches: (pathname: string) => pathname === "/dashboard",
  },
  {
    href: "/marketplace",
    label: "Marketplace",
    icon: Search,
    requiresAuth: false,
    matches: (pathname: string) =>
      pathname === "/marketplace" || pathname.startsWith("/marketplace/"),
  },
  {
    href: "/portfolio",
    label: "Portfolio",
    icon: WalletCards,
    requiresAuth: true,
    matches: (pathname: string) => pathname === "/portfolio",
  },
  {
    href: "/orders",
    label: "Orders",
    icon: Receipt,
    requiresAuth: true,
    matches: (pathname: string) => pathname === "/orders",
  },
  {
    href: "/payments",
    label: "Payments",
    icon: WalletCards,
    requiresAuth: true,
    matches: (pathname: string) => pathname === "/payments",
  },
  {
    href: "/documents",
    label: "Documents",
    icon: FileText,
    requiresAuth: true,
    matches: (pathname: string) => pathname === "/documents",
  },
];

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const { loading, logout, user } = useSession();

  const visibleNavigation = navigation.filter((item) => !item.requiresAuth || user);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(0,119,182,0.14),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(196,138,66,0.18),_transparent_26%),linear-gradient(180deg,_rgba(252,250,246,1),_rgba(244,239,229,0.94))] text-foreground">
      <header className="sticky top-0 z-50 border-b border-white/60 bg-[#fcfaf6]/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <Link href="/marketplace" className="text-lg font-semibold tracking-tight text-foreground">
                Eternal Exchange
              </Link>
              <Badge variant="muted">Solana localnet</Badge>
              <Badge variant="secondary">Investor workspace</Badge>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {loading ? (
                <div className="text-sm text-muted-foreground">Loading session...</div>
              ) : user ? (
                <>
                  <div className="rounded-[1.25rem] border border-white/70 bg-white/80 px-3 py-2 text-right shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      {formatRole(user.role)}
                    </p>
                    <p className="mt-1 text-sm font-medium text-foreground">{user.fullName}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Wallet {truncateAddress(user.managedWalletAddress)}
                    </p>
                  </div>
                  <StatusBadge value={user.kycStatus} />
                  <Button variant="outline" onClick={() => void logout()} className="gap-2">
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </Button>
                </>
              ) : (
                <>
                  <Button asChild variant="outline">
                    <Link href="/signup">Create account</Link>
                  </Button>
                  <Button asChild>
                    <Link href="/login">Sign in</Link>
                  </Button>
                </>
              )}
            </div>
          </div>

          <nav className="flex flex-wrap gap-2">
            {visibleNavigation.map((item) => {
              const Icon = item.icon;
              const active = item.matches(pathname);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                    active
                      ? "border-primary/20 bg-primary/10 text-primary"
                      : "border-white/70 bg-white/80 text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
            {user ? (
              <Link
                href="/kyc"
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                  pathname === "/kyc"
                    ? "border-primary/20 bg-primary/10 text-primary"
                    : "border-white/70 bg-white/80 text-muted-foreground hover:text-foreground",
                )}
              >
                <ShieldCheck className="h-4 w-4" />
                KYC
              </Link>
            ) : null}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}

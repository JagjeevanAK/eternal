"use client";

import { useEffect, useState, type ReactNode } from "react";
import { WalletReadyState } from "@solana/wallet-adapter-base";
import { useWallet } from "@solana/wallet-adapter-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronDown,
  FileText,
  LayoutDashboard,
  LogOut,
  Receipt,
  Search,
  ShieldCheck,
  WalletCards,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/features/exchange/components/StatusBadge";
import { useSession } from "@/features/exchange/context/SessionContext";
import { formatRole, truncateAddress } from "@/features/exchange/lib/format";
import {
  getStoredBoundWallet,
  setStoredBoundWallet,
  type StoredBoundWallet,
} from "@/lib/wallet-storage";
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
  const { bindWallet, loading, logout, refreshSession, user } = useSession();
  const { wallets } = useWallet();
  const [storedWallet, setStoredWalletState] = useState<StoredBoundWallet | null>(null);
  const [pendingWalletName, setPendingWalletName] = useState<string | null>(null);
  const [walletFeedback, setWalletFeedback] = useState<string | null>(null);
  const [walletPickerOpen, setWalletPickerOpen] = useState(false);

  const detectedWallets = wallets.filter(
    ({ readyState }) =>
      readyState === WalletReadyState.Installed || readyState === WalletReadyState.Loadable,
  );

  const visibleNavigation = navigation.filter((item) => !item.requiresAuth || user);
  const showKycNavigation = Boolean(user && user.kycStatus !== "approved");
  const currentWalletName = storedWallet?.walletName ?? "Manual wallet";
  const activeWalletEntry = detectedWallets.find(
    (walletEntry) => String(walletEntry.adapter.name) === storedWallet?.walletName,
  );
  const userInitials = user
    ? user.fullName
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join("")
    : "";

  useEffect(() => {
    const nextStoredWallet = getStoredBoundWallet();

    if (
      nextStoredWallet &&
      nextStoredWallet.userId === user?.id &&
      nextStoredWallet.address === (user?.externalWalletAddress ?? "")
    ) {
      setStoredWalletState(nextStoredWallet);
      return;
    }

    if (user?.id && user.externalWalletAddress) {
      const fallbackWallet = {
        userId: user.id,
        walletName: null,
        address: user.externalWalletAddress,
        boundAt: new Date().toISOString(),
      } satisfies StoredBoundWallet;
      setStoredWalletState(fallbackWallet);
      setStoredBoundWallet(fallbackWallet);
      return;
    }

    setStoredWalletState(null);
  }, [user?.externalWalletAddress, user?.id]);

  async function handleChangeWallet(walletName: string) {
    const walletEntry = detectedWallets.find((value) => String(value.adapter.name) === walletName);

    if (!walletEntry || !user?.id) {
      setWalletFeedback("Selected wallet is no longer available.");
      return;
    }

    setPendingWalletName(walletName);
    setWalletFeedback(`Connecting ${walletName}...`);

    try {
      await walletEntry.adapter.connect();
      const nextAddress = walletEntry.adapter.publicKey?.toBase58();

      if (!nextAddress) {
        throw new Error(`${walletName} connected without exposing a Solana public key.`);
      }

      setWalletFeedback(`Binding ${walletName}...`);
      await bindWallet(nextAddress);
      const nextStoredWallet = {
        userId: user.id,
        walletName,
        address: nextAddress,
        boundAt: new Date().toISOString(),
      } satisfies StoredBoundWallet;
      setStoredWalletState(nextStoredWallet);
      setStoredBoundWallet(nextStoredWallet);
      setWalletFeedback(`${walletName} is now connected to this profile.`);
      setWalletPickerOpen(false);
      await refreshSession();
    } catch (error) {
      setWalletFeedback(error instanceof Error ? error.message : `Failed to connect ${walletName}.`);
    } finally {
      setPendingWalletName(null);
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(0,119,182,0.14),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(196,138,66,0.18),_transparent_26%),linear-gradient(180deg,_rgba(252,250,246,1),_rgba(244,239,229,0.94))] text-foreground">
      <header className="sticky top-0 z-50 border-b border-white/60 bg-[#fcfaf6]/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <Link href="/marketplace" className="text-lg font-semibold tracking-tight text-foreground">
                Eternal Exchange
              </Link>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {loading ? (
                <div className="text-sm text-muted-foreground">Loading session...</div>
              ) : user ? (
                <>
                  {showKycNavigation ? <StatusBadge value={user.kycStatus} /> : null}
                  <div className="group relative">
                    <button
                      type="button"
                      className="flex items-center gap-3 rounded-full border border-white/70 bg-white/88 px-2.5 py-2 shadow-sm shadow-sky-950/5 transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
                    >
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[linear-gradient(135deg,rgba(0,119,182,0.16),rgba(196,138,66,0.2))] text-sm font-semibold text-foreground">
                        {userInitials}
                      </div>
                      <div className="min-w-0 text-left">
                        <p className="text-sm font-semibold text-foreground">{user.fullName}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {formatRole(user.role)} · {truncateAddress(user.managedWalletAddress)}
                        </p>
                      </div>
                      <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-hover:rotate-180 group-focus-within:rotate-180" />
                    </button>

                    <div className="pointer-events-none absolute right-0 top-full z-20 mt-2 w-72 translate-y-2 rounded-[1.5rem] border border-white/70 bg-[#fcfaf6]/96 p-3 opacity-0 shadow-2xl shadow-sky-950/10 transition-all duration-150 group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:translate-y-0 group-focus-within:opacity-100">
                      <div className="rounded-[1.2rem] border border-white/70 bg-white/85 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                          {formatRole(user.role)}
                        </p>
                        <p className="mt-2 text-base font-semibold text-foreground">{user.fullName}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{user.email}</p>
                        <p className="mt-3 text-xs text-muted-foreground">
                          Managed wallet {truncateAddress(user.managedWalletAddress)}
                        </p>
                        {user.externalWalletAddress ? (
                          <p className="mt-1 text-xs text-muted-foreground">
                            Bound wallet {truncateAddress(user.externalWalletAddress)}
                          </p>
                        ) : null}
                      </div>

                      <div className="mt-3 rounded-[1.2rem] border border-white/70 bg-white/85 p-3">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                            Wallet
                          </p>
                          {pendingWalletName ? (
                            <span className="text-xs text-muted-foreground">Updating...</span>
                          ) : null}
                        </div>
                        <button
                          type="button"
                          onClick={() => setWalletPickerOpen((current) => !current)}
                          className="mt-3 flex w-full items-center justify-between gap-3 rounded-[1rem] border border-white/70 bg-[#fcfaf6] px-3 py-3 text-left transition-colors hover:border-primary/20 hover:bg-primary/5"
                        >
                          <div className="flex items-center gap-3">
                            {activeWalletEntry ? (
                              <img
                                src={activeWalletEntry.adapter.icon}
                                alt={`${currentWalletName} icon`}
                                className="h-9 w-9 rounded-md"
                              />
                            ) : (
                              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[linear-gradient(135deg,rgba(0,119,182,0.12),rgba(196,138,66,0.16))] text-xs font-semibold text-foreground">
                                {currentWalletName.slice(0, 1).toUpperCase()}
                              </div>
                            )}
                            <div>
                              <p className="text-sm font-medium text-foreground">{currentWalletName}</p>
                              <p className="text-xs text-muted-foreground">
                                {user.externalWalletAddress
                                  ? truncateAddress(user.externalWalletAddress)
                                  : "No external wallet bound yet"}
                              </p>
                            </div>
                          </div>
                          <ChevronDown
                            className={cn(
                              "h-4 w-4 text-muted-foreground transition-transform",
                              walletPickerOpen ? "rotate-180" : "",
                            )}
                          />
                        </button>
                        {walletPickerOpen ? (
                          <div className="mt-3 space-y-2">
                            {detectedWallets.length ? (
                              detectedWallets.map((walletEntry) => {
                                const walletName = String(walletEntry.adapter.name);
                                const isActive = storedWallet?.walletName === walletName;

                                return (
                                  <button
                                    key={walletName}
                                    type="button"
                                    onClick={() => void handleChangeWallet(walletName)}
                                    disabled={pendingWalletName !== null}
                                    className={cn(
                                      "flex w-full items-center justify-between gap-3 rounded-[1rem] border px-3 py-2.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60",
                                      isActive
                                        ? "border-emerald-500/20 bg-emerald-500/10"
                                        : "border-white/70 bg-[#fcfaf6] hover:border-primary/20 hover:bg-primary/5",
                                    )}
                                  >
                                    <div className="flex items-center gap-3">
                                      <img
                                        src={walletEntry.adapter.icon}
                                        alt={`${walletName} icon`}
                                        className="h-8 w-8 rounded-md"
                                      />
                                      <div>
                                        <p className="text-sm font-medium text-foreground">{walletName}</p>
                                        <p className="text-xs text-muted-foreground">
                                          {isActive ? "Currently bound" : "Click to switch provider"}
                                        </p>
                                      </div>
                                    </div>
                                    <span className="text-xs font-medium text-muted-foreground">
                                      {pendingWalletName === walletName ? "Connecting..." : isActive ? "Connected" : "Use"}
                                    </span>
                                  </button>
                                );
                              })
                            ) : (
                              <p className="rounded-[1rem] border border-dashed border-white/70 bg-[#fcfaf6] px-3 py-3 text-xs text-muted-foreground">
                                No compatible wallets detected in this browser.
                              </p>
                            )}
                          </div>
                        ) : null}
                        {walletFeedback ? (
                          <p className="mt-3 text-xs text-muted-foreground">{walletFeedback}</p>
                        ) : null}
                      </div>

                      <div className="mt-3 grid gap-2">
                        {showKycNavigation ? (
                          <Button asChild variant="outline" className="w-full justify-start rounded-[1rem]">
                            <Link href="/kyc">Review KYC and wallet</Link>
                          </Button>
                        ) : null}
                        <Button
                          variant="outline"
                          onClick={() => void logout()}
                          className="w-full justify-start rounded-[1rem] gap-2"
                        >
                          <LogOut className="h-4 w-4" />
                          Sign out
                        </Button>
                      </div>
                    </div>
                  </div>
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
            {showKycNavigation ? (
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

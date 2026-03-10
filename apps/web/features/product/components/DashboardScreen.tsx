"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useWallet } from "@solana/wallet-adapter-react";
import { apiFetch } from "@/lib/product-api";
import { AuthGate } from "@/features/product/components/AuthGate";
import { StatusBadge } from "@/features/product/components/StatusBadge";
import { useSession } from "@/features/product/context/SessionContext";
import { formatInr } from "@/features/product/lib/format";
import type { DashboardResponse } from "@/features/product/types";

export function DashboardScreen() {
  const { publicKey } = useWallet();
  const { bindWallet, refreshSession, token, user } = useSession();
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const response = await apiFetch<DashboardResponse>("/dashboard", { token });
      setDashboard(response);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load dashboard.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleBindWallet = async () => {
    if (!publicKey) {
      toast.error("Connect a wallet first.");
      return;
    }

    try {
      await bindWallet(publicKey.toBase58());
      await refreshSession();
      toast.success("Wallet bound to the local account.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to bind wallet.");
    }
  };

  return (
    <AuthGate>
      {loading || !dashboard ? (
        <div className="rounded-[2rem] border border-border bg-card p-8 text-sm text-muted-foreground">
          Loading workspace...
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">Workspace</p>
              <h1 className="mt-3 text-3xl font-semibold text-foreground">Welcome back, {dashboard.user.fullName}</h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
                This dashboard keeps the local asset marketplace anchored in INR balances, compliance, and fixed-price
                order settlement.
              </p>
            </div>
            <StatusBadge value={dashboard.user.kycStatus} />
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <div className="rounded-[1.75rem] border border-border bg-card p-5">
              <p className="text-sm text-muted-foreground">Cash balance</p>
              <p className="mt-3 text-2xl font-semibold text-foreground">
                {formatInr(dashboard.stats.cashBalanceInrMinor)}
              </p>
            </div>
            <div className="rounded-[1.75rem] border border-border bg-card p-5">
              <p className="text-sm text-muted-foreground">Open orders</p>
              <p className="mt-3 text-2xl font-semibold text-foreground">{dashboard.stats.activeOrders}</p>
            </div>
            <div className="rounded-[1.75rem] border border-border bg-card p-5">
              <p className="text-sm text-muted-foreground">Settled orders</p>
              <p className="mt-3 text-2xl font-semibold text-foreground">{dashboard.stats.settledOrders}</p>
            </div>
            <div className="rounded-[1.75rem] border border-border bg-card p-5">
              <p className="text-sm text-muted-foreground">Portfolio positions</p>
              <p className="mt-3 text-2xl font-semibold text-foreground">{dashboard.stats.holdings}</p>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[0.9fr,1.1fr]">
            <section className="rounded-[2rem] border border-border bg-card p-6">
              <h2 className="text-xl font-semibold text-foreground">Next steps</h2>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-muted-foreground">
                {dashboard.nextSteps.map((value) => (
                  <li key={value} className="rounded-2xl bg-background px-4 py-3">
                    {value}
                  </li>
                ))}
              </ul>

              <div className="mt-6 rounded-2xl border border-border bg-background p-4">
                <p className="text-sm font-medium text-foreground">Wallet binding</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Managed wallet: {user?.managedWalletAddress}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  External wallet: {user?.externalWalletAddress ?? "Not bound yet"}
                </p>
                <button
                  onClick={handleBindWallet}
                  className="mt-4 rounded-xl border border-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-card"
                >
                  {publicKey ? "Bind connected wallet" : "Connect wallet, then bind"}
                </button>
              </div>
            </section>

            <section className="space-y-6">
              <div className="rounded-[2rem] border border-border bg-card p-6">
                <div className="flex items-center justify-between gap-4">
                  <h2 className="text-xl font-semibold text-foreground">Featured live assets</h2>
                  <Link href="/marketplace" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                    See all
                  </Link>
                </div>
                <div className="mt-4 grid gap-4">
                  {dashboard.featuredProperties.map((property) => (
                    <Link
                      key={property.id}
                      href={`/marketplace/${property.slug}`}
                      className="rounded-2xl border border-border bg-background p-4 transition-colors hover:border-ring/40"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-lg font-semibold text-foreground">{property.name}</p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {property.assetClassLabel} · {property.symbol}
                          </p>
                        </div>
                        <StatusBadge value={property.status} />
                      </div>
                      <p className="mt-3 text-sm text-muted-foreground">
                        {formatInr(property.minimumInvestmentInrMinor)} minimum ticket
                      </p>
                    </Link>
                  ))}
                </div>
              </div>

              <div className="rounded-[2rem] border border-border bg-card p-6">
                <h2 className="text-xl font-semibold text-foreground">Recent notifications</h2>
                <div className="mt-4 space-y-3">
                  {dashboard.notifications.map((item) => (
                    <div key={item.id} className="rounded-2xl bg-background p-4">
                      <p className="text-sm font-medium text-foreground">{item.title}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{item.body}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>
        </div>
      )}
    </AuthGate>
  );
}

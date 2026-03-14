"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Bell, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/product-api";
import { AuthGate } from "@/features/exchange/components/AuthGate";
import { EmptyState, MetricTile, Notice, ScreenHeader } from "@/features/exchange/components/ExchangePrimitives";
import { StatusBadge } from "@/features/exchange/components/StatusBadge";
import { useSession } from "@/features/exchange/context/SessionContext";
import { formatDateTime, formatInr, truncateAddress } from "@/features/exchange/lib/format";
import type { DashboardResponse } from "@/features/exchange/types";

export function DashboardScreen() {
  const { token, user } = useSession();
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) {
      setDashboard(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await apiFetch<DashboardResponse>("/dashboard", { token });
      setDashboard(response);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load dashboard.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <AuthGate allowedRoles={["investor"]}>
      <div className="space-y-6">
        <ScreenHeader
          eyebrow="Workspace"
          title={`Welcome back${user ? `, ${user.fullName}` : ""}`}
          description="Track account readiness, capital, and live offerings from a routed investor dashboard instead of one long exchange page."
          actions={
            <>
              <Button asChild variant="outline">
                <Link href="/marketplace">Browse marketplace</Link>
              </Button>
              <Button asChild>
                <Link href="/portfolio">Open portfolio</Link>
              </Button>
            </>
          }
        />

        {error ? <Notice tone="error">{error}</Notice> : null}

        {loading || !dashboard ? (
          <Card className="border-white/70 bg-card/92 shadow-2xl shadow-sky-950/10 backdrop-blur">
            <CardContent className="px-6 py-10 text-sm text-muted-foreground">
              Loading workspace summary...
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricTile
                label="Cash balance"
                value={formatInr(dashboard.stats.cashBalanceInrMinor)}
                detail="Available local INR balance for pending order payments."
              />
              <MetricTile
                label="Active orders"
                value={String(dashboard.stats.activeOrders)}
                detail="Orders awaiting payment capture or settlement."
              />
              <MetricTile
                label="Holdings"
                value={String(dashboard.stats.holdings)}
                detail="Distinct live positions held in the investor account."
              />
              <MetricTile
                label="Active listings"
                value={String(dashboard.stats.activeListings)}
                detail="Seller offers currently live on the secondary board."
              />
            </div>

            <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
              <Card className="border-white/70 bg-card/92 shadow-2xl shadow-sky-950/10 backdrop-blur">
                <CardHeader>
                  <CardTitle className="text-2xl">Account readiness</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-[1.4rem] border border-white/70 bg-white/80 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-lg font-semibold text-foreground">{dashboard.user.fullName}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{dashboard.user.email}</p>
                      </div>
                      <StatusBadge value={dashboard.user.kycStatus} />
                    </div>
                    <div className="mt-4 grid gap-3 text-sm text-muted-foreground">
                      <div className="flex items-center justify-between gap-3">
                        <span>Managed wallet</span>
                        <span className="font-medium text-foreground">
                          {truncateAddress(dashboard.user.managedWalletAddress)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span>External wallet</span>
                        <span className="font-medium text-foreground">
                          {truncateAddress(dashboard.user.externalWalletAddress)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      Next steps
                    </p>
                    {dashboard.nextSteps.length ? (
                      dashboard.nextSteps.map((step) => (
                        <div
                          key={step}
                          className="rounded-[1.2rem] border border-white/70 bg-white/80 px-4 py-3 text-sm leading-6 text-muted-foreground"
                        >
                          {step}
                        </div>
                      ))
                    ) : (
                      <EmptyState
                        title="No outstanding prompts"
                        description="The account is fully staged for the current seeded marketplace."
                      />
                    )}
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <Button asChild variant="outline">
                      <Link href="/kyc">
                        <Wallet className="h-4 w-4" />
                        KYC and wallet
                      </Link>
                    </Button>
                    <Button asChild variant="outline">
                      <Link href="/payments">Payments queue</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-6">
                <Card className="border-white/70 bg-card/92 shadow-2xl shadow-sky-950/10 backdrop-blur">
                  <CardHeader>
                    <CardTitle className="text-2xl">Featured live assets</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {dashboard.featuredProperties.length ? (
                      dashboard.featuredProperties.map((property) => (
                        <Link
                          key={property.id}
                          href={`/marketplace/${property.slug}`}
                          className="block rounded-[1.4rem] border border-white/70 bg-white/80 p-4 transition-colors hover:border-primary/20"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                                {property.heroTag}
                              </p>
                              <p className="mt-2 text-lg font-semibold text-foreground">{property.name}</p>
                              <p className="mt-1 text-sm text-muted-foreground">
                                {property.city}, {property.state}
                              </p>
                            </div>
                            <StatusBadge value={property.status} />
                          </div>
                          <div className="mt-4 flex items-center justify-between gap-3 text-sm">
                            <span className="text-muted-foreground">{property.assetClassLabel}</span>
                            <span className="font-semibold text-foreground">
                              {formatInr(property.minimumInvestmentInrMinor)} minimum
                            </span>
                          </div>
                        </Link>
                      ))
                    ) : (
                      <EmptyState
                        title="No featured assets"
                        description="Live offerings will show up here after the local exchange publishes inventory."
                      />
                    )}
                  </CardContent>
                </Card>

                <Card className="border-white/70 bg-card/92 shadow-2xl shadow-sky-950/10 backdrop-blur">
                  <CardHeader>
                    <CardTitle className="text-2xl">Recent notifications</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {dashboard.notifications.length ? (
                      dashboard.notifications.map((notification) => (
                        <div
                          key={notification.id}
                          className="rounded-[1.4rem] border border-white/70 bg-white/80 p-4"
                        >
                          <div className="flex items-start gap-3">
                            <Bell className="mt-0.5 h-4 w-4 text-primary" />
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-foreground">{notification.title}</p>
                              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                                {notification.body}
                              </p>
                              <p className="mt-3 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                                {formatDateTime(notification.createdAt)}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <EmptyState
                        title="No notifications yet"
                        description="Exchange events will appear here when orders, payouts, or review states change."
                      />
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>

            <div className="flex justify-end">
              <Button asChild variant="outline">
                <Link href="/orders">
                  Review all orders
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </>
        )}
      </div>
    </AuthGate>
  );
}

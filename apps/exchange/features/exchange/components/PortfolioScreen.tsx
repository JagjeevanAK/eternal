"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/product-api";
import { AuthGate } from "@/features/exchange/components/AuthGate";
import { EmptyState, Notice, ScreenHeader } from "@/features/exchange/components/ExchangePrimitives";
import { StatusBadge } from "@/features/exchange/components/StatusBadge";
import { useSession } from "@/features/exchange/context/SessionContext";
import { formatDate, formatInr, formatUnits, truncateAddress } from "@/features/exchange/lib/format";
import type { PortfolioResponse } from "@/features/exchange/types";

export function PortfolioScreen() {
  const { token } = useSession();
  const [portfolio, setPortfolio] = useState<PortfolioResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pendingPropertyId, setPendingPropertyId] = useState<string | null>(null);
  const [listingDrafts, setListingDrafts] = useState<Record<string, { units: string; price: string }>>({});

  const load = useCallback(async () => {
    if (!token) {
      setPortfolio(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await apiFetch<PortfolioResponse>("/portfolio", { token });
      setPortfolio(response);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load portfolio.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  async function createListing(propertyId: string) {
    const draft = listingDrafts[propertyId];
    const units = Number(draft?.units ?? "0");
    const pricePerUnitInrMinor = Number(draft?.price ?? "0");

    if (!token || !Number.isInteger(units) || units <= 0 || !Number.isInteger(pricePerUnitInrMinor) || pricePerUnitInrMinor <= 0) {
      setError("Enter valid whole-number listing units and price.");
      setMessage(null);
      return;
    }

    setPendingPropertyId(propertyId);
    setError(null);
    setMessage(null);

    try {
      await apiFetch("/listings", {
        method: "POST",
        token,
        body: {
          propertyId,
          units,
          pricePerUnitInrMinor,
        },
      });

      setListingDrafts((current) => ({
        ...current,
        [propertyId]: { units: "", price: "" },
      }));
      setMessage("Secondary listing published.");
      await load();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Failed to publish listing.");
    } finally {
      setPendingPropertyId(null);
    }
  }

  return (
    <AuthGate allowedRoles={["investor"]}>
      <div className="space-y-6">
        <ScreenHeader
          eyebrow="Portfolio"
          title="Holdings, listings, and payouts"
          description="Manage current positions and publish new secondary liquidity from a dedicated portfolio route."
        />

        {error ? <Notice tone="error">{error}</Notice> : null}
        {message ? <Notice tone="success">{message}</Notice> : null}

        {loading || !portfolio ? (
          <Card className="border-white/70 bg-card/92 shadow-2xl shadow-sky-950/10 backdrop-blur">
            <CardContent className="px-6 py-10 text-sm text-muted-foreground">
              Loading your portfolio...
            </CardContent>
          </Card>
        ) : (
          <>
            <section className="space-y-4">
              {portfolio.holdings.length ? (
                portfolio.holdings.map((holding) => {
                  const maxUnits = Math.max(holding.units - holding.listedUnits, 0);
                  const draft = listingDrafts[holding.propertyId];

                  return (
                    <Card
                      key={holding.id}
                      className="border-white/70 bg-card/92 shadow-2xl shadow-sky-950/10 backdrop-blur"
                    >
                      <CardContent className="space-y-5 px-6 py-6">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <div>
                            <h2 className="text-2xl font-semibold text-foreground">
                              {holding.property.name}
                            </h2>
                            <p className="mt-2 text-sm text-muted-foreground">
                              {holding.property.assetClassLabel} · {holding.property.symbol} · {formatUnits(holding.units)} units held
                            </p>
                          </div>
                          <div className="rounded-[1.2rem] border border-white/70 bg-white/80 px-4 py-3 text-right">
                            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                              Current value
                            </p>
                            <p className="mt-2 text-lg font-semibold text-foreground">
                              {formatInr(holding.marketValueInrMinor)}
                            </p>
                          </div>
                        </div>

                        <div className="grid gap-3 md:grid-cols-3">
                          <div className="rounded-[1.2rem] border border-white/70 bg-white/80 p-4">
                            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                              Average price
                            </p>
                            <p className="mt-2 font-semibold text-foreground">
                              {formatInr(holding.averagePriceInrMinor)}
                            </p>
                          </div>
                          <div className="rounded-[1.2rem] border border-white/70 bg-white/80 p-4">
                            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                              Listed units
                            </p>
                            <p className="mt-2 font-semibold text-foreground">
                              {formatUnits(holding.listedUnits)}
                            </p>
                          </div>
                          <div className="rounded-[1.2rem] border border-white/70 bg-white/80 p-4">
                            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                              Holding account
                            </p>
                            <p className="mt-2 font-semibold text-foreground">
                              {truncateAddress(holding.onChainAddress)}
                            </p>
                          </div>
                        </div>

                        <div className="rounded-[1.4rem] border border-white/70 bg-white/80 p-4">
                          <p className="font-medium text-foreground">Create fixed-price listing</p>
                          <div className="mt-4 grid gap-3 md:grid-cols-2">
                            <Input
                              type="number"
                              min="1"
                              max={maxUnits}
                              value={draft?.units ?? ""}
                              onChange={(event) =>
                                setListingDrafts((current) => ({
                                  ...current,
                                  [holding.propertyId]: {
                                    units: event.target.value,
                                    price:
                                      current[holding.propertyId]?.price ??
                                      String(holding.property.unitPriceInrMinor),
                                  },
                                }))
                              }
                              placeholder={`Units to list${maxUnits ? ` (max ${maxUnits})` : ""}`}
                            />
                            <Input
                              type="number"
                              min="1"
                              value={draft?.price ?? String(holding.property.unitPriceInrMinor)}
                              onChange={(event) =>
                                setListingDrafts((current) => ({
                                  ...current,
                                  [holding.propertyId]: {
                                    units: current[holding.propertyId]?.units ?? "",
                                    price: event.target.value,
                                  },
                                }))
                              }
                              placeholder="Price per unit"
                            />
                          </div>
                          <p className="mt-3 text-sm text-muted-foreground">
                            Available to list: {formatUnits(maxUnits)} units.
                          </p>
                          <Button
                            className="mt-4"
                            variant="outline"
                            onClick={() => void createListing(holding.propertyId)}
                            disabled={pendingPropertyId !== null || maxUnits === 0}
                          >
                            {pendingPropertyId === holding.propertyId ? "Publishing..." : "Create listing"}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              ) : (
                <EmptyState
                  title="No holdings yet"
                  description="Settle a primary or secondary order to create your first portfolio position."
                />
              )}
            </section>

            <section className="grid gap-6 xl:grid-cols-2">
              <Card className="border-white/70 bg-card/92 shadow-2xl shadow-sky-950/10 backdrop-blur">
                <CardHeader>
                  <CardTitle className="text-2xl">Active listings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {portfolio.listings.length ? (
                    portfolio.listings.map((listing) => (
                      <div
                        key={listing.id}
                        className="rounded-[1.3rem] border border-white/70 bg-white/80 p-4"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-medium text-foreground">{listing.property?.name}</p>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {formatUnits(listing.unitsRemaining)} of {formatUnits(listing.unitsListed)} units remaining
                            </p>
                          </div>
                          <StatusBadge value={listing.status} />
                        </div>
                      </div>
                    ))
                  ) : (
                    <EmptyState
                      title="No active listings"
                      description="Publish sell-side liquidity from a holding to populate this section."
                    />
                  )}
                </CardContent>
              </Card>

              <Card className="border-white/70 bg-card/92 shadow-2xl shadow-sky-950/10 backdrop-blur">
                <CardHeader>
                  <CardTitle className="text-2xl">Distributions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {portfolio.distributions.length ? (
                    portfolio.distributions.map((distribution) => (
                      <div
                        key={distribution.id}
                        className="rounded-[1.3rem] border border-white/70 bg-white/80 p-4"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-medium text-foreground">{distribution.property.name}</p>
                            <p className="mt-1 text-sm text-muted-foreground">
                              Payable {formatDate(distribution.payableAt)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-foreground">
                              {formatInr(distribution.amountInrMinor)}
                            </p>
                            <StatusBadge value={distribution.status} />
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <EmptyState
                      title="No announced distributions"
                      description="Cash distributions created by the platform will appear here."
                    />
                  )}
                </CardContent>
              </Card>
            </section>
          </>
        )}
      </div>
    </AuthGate>
  );
}

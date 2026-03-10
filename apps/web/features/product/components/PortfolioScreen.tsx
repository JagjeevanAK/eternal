"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/product-api";
import { AuthGate } from "@/features/product/components/AuthGate";
import { StatusBadge } from "@/features/product/components/StatusBadge";
import { useSession } from "@/features/product/context/SessionContext";
import { formatDate, formatInr } from "@/features/product/lib/format";
import type { PortfolioResponse } from "@/features/product/types";

export function PortfolioScreen() {
  const { token } = useSession();
  const [portfolio, setPortfolio] = useState<PortfolioResponse | null>(null);
  const [listingDrafts, setListingDrafts] = useState<Record<string, { units: string; price: string }>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const response = await apiFetch<PortfolioResponse>("/portfolio", { token });
      setPortfolio(response);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load portfolio.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const createListing = async (propertyId: string) => {
    const draft = listingDrafts[propertyId];
    if (!token || !draft) {
      return;
    }

    try {
      await apiFetch<{ listing: unknown }>("/listings", {
        method: "POST",
        token,
        body: {
          propertyId,
          units: Number(draft.units),
          pricePerUnitInrMinor: Number(draft.price),
        },
      });

      toast.success("Secondary listing published.");
      setListingDrafts((current) => ({
        ...current,
        [propertyId]: { units: "", price: "" },
      }));
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to publish listing.");
    }
  };

  return (
    <AuthGate allowedRoles={["investor"]}>
      {loading || !portfolio ? (
        <div className="rounded-[2rem] border border-border bg-card p-8 text-sm text-muted-foreground">
          Loading your portfolio...
        </div>
      ) : (
        <div className="space-y-6">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">Portfolio</p>
            <h1 className="mt-3 text-3xl font-semibold text-foreground">Holdings, fixed-price listings, and payouts</h1>
          </div>

          <section className="space-y-4">
            {portfolio.holdings.map((holding) => (
              <div key={holding.id} className="rounded-[2rem] border border-border bg-card p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-foreground">{holding.property.name}</h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {holding.property.assetClassLabel} · {holding.property.symbol} · {holding.units} units held, {holding.listedUnits} currently listed
                    </p>
                  </div>
                  <div className="rounded-2xl bg-background px-4 py-3 text-right">
                    <p className="text-xs text-muted-foreground">Current local value</p>
                    <p className="mt-2 text-lg font-semibold text-foreground">{formatInr(holding.marketValueInrMinor)}</p>
                  </div>
                </div>

                <div className="mt-6 grid gap-3 md:grid-cols-2">
                  <label className="text-sm font-medium text-muted-foreground">
                    Units to list
                    <input
                      type="number"
                      min="1"
                      max={Math.max(holding.units - holding.listedUnits, 0)}
                      value={listingDrafts[holding.propertyId]?.units ?? ""}
                      onChange={(event) =>
                        setListingDrafts((current) => ({
                          ...current,
                          [holding.propertyId]: {
                            units: event.target.value,
                            price: current[holding.propertyId]?.price ?? String(holding.property.unitPriceInrMinor),
                          },
                        }))
                      }
                      className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition-colors focus:border-ring"
                    />
                  </label>
                  <label className="text-sm font-medium text-muted-foreground">
                    Price per unit (INR minor)
                    <input
                      type="number"
                      min="1"
                      value={listingDrafts[holding.propertyId]?.price ?? String(holding.property.unitPriceInrMinor)}
                      onChange={(event) =>
                        setListingDrafts((current) => ({
                          ...current,
                          [holding.propertyId]: {
                            units: current[holding.propertyId]?.units ?? "",
                            price: event.target.value,
                          },
                        }))
                      }
                      className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition-colors focus:border-ring"
                    />
                  </label>
                </div>

                <button
                  onClick={() => createListing(holding.propertyId)}
                  className="mt-4 rounded-2xl border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-background"
                >
                  Create fixed-price listing
                </button>
              </div>
            ))}
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <div className="rounded-[2rem] border border-border bg-card p-6">
              <h2 className="text-xl font-semibold text-foreground">Active listings</h2>
              <div className="mt-4 space-y-3">
                {portfolio.listings.length === 0 ? (
                  <p className="text-sm text-muted-foreground">You do not have active listings.</p>
                ) : (
                  portfolio.listings.map((listing) => (
                    <div key={listing.id} className="rounded-2xl bg-background p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="text-sm font-medium text-foreground">{listing.property?.name}</p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {listing.unitsRemaining} units remaining at {formatInr(listing.pricePerUnitInrMinor)}
                          </p>
                        </div>
                        <StatusBadge value={listing.status} />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-[2rem] border border-border bg-card p-6">
              <h2 className="text-xl font-semibold text-foreground">Payouts</h2>
              <div className="mt-4 space-y-3">
                {portfolio.distributions.map((distribution) => (
                  <div key={distribution.id} className="rounded-2xl bg-background p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium text-foreground">{distribution.property.name}</p>
                        <p className="mt-1 text-sm text-muted-foreground">Announced {formatDate(distribution.announcedAt)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-foreground">{formatInr(distribution.amountInrMinor)}</p>
                        <StatusBadge value={distribution.status} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      )}
    </AuthGate>
  );
}

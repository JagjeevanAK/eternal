"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Building2, Clock3, FileText, MapPin } from "lucide-react";
import { apiFetch } from "@/lib/product-api";
import { useSession } from "@/features/product/context/SessionContext";
import { formatDate, formatInr, formatPercent } from "@/features/product/lib/format";
import type { Listing, Order, PaymentIntent, PropertyDetailResponse } from "@/features/product/types";
import { StatusBadge } from "@/features/product/components/StatusBadge";

export function PropertyDetailScreen({ slug }: { slug: string }) {
  const { token, user } = useSession();
  const [state, setState] = useState<PropertyDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [primaryUnits, setPrimaryUnits] = useState("10");
  const [tradeUnits, setTradeUnits] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const loadProperty = useCallback(async () => {
    try {
      setError(null);
      const response = await apiFetch<PropertyDetailResponse>(`/assets/${slug}`);
      setState(response);
    } catch (value) {
      setError(value instanceof Error ? value.message : "Failed to load the asset.");
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    void loadProperty();
  }, [loadProperty]);

  const property = state?.property ?? null;
  const compactAddress = (value: string | null | undefined) =>
    value ? `${value.slice(0, 6)}...${value.slice(-6)}` : "pending";

  const totalPrimaryAmount = useMemo(() => {
    if (!property) {
      return 0;
    }

    return (Number(primaryUnits) || 0) * property.unitPriceInrMinor;
  }, [primaryUnits, property]);

  const submitPrimaryOrder = async () => {
    if (!token || !property) {
      toast.error("Sign in first to create a subscription.");
      return;
    }

    setSubmitting(true);

    try {
      const response = await apiFetch<{ order: Order; payment: PaymentIntent }>("/orders/primary", {
        method: "POST",
        token,
        body: {
          propertyId: property.id,
          units: Number(primaryUnits),
        },
      });

      toast.success("Primary order created.", {
        description: `Payment ${response.payment.reference} is waiting in the Payments workspace.`,
      });
    } catch (value) {
      toast.error(value instanceof Error ? value.message : "Failed to create the order.");
    } finally {
      setSubmitting(false);
    }
  };

  const submitSecondaryOrder = async (listing: Listing) => {
    if (!token) {
      toast.error("Sign in first to buy a listing.");
      return;
    }

    const units = Number(tradeUnits[listing.id] || "0");
    if (!units) {
      toast.error("Enter a trade size first.");
      return;
    }

    setSubmitting(true);

    try {
      const response = await apiFetch<{ order: Order; payment: PaymentIntent }>(
        `/listings/${listing.id}/buy`,
        {
          method: "POST",
          token,
          body: { units },
        },
      );

      toast.success("Secondary order created.", {
        description: `Payment ${response.payment.reference} is waiting in the Payments workspace.`,
      });
      await loadProperty();
    } catch (value) {
      toast.error(value instanceof Error ? value.message : "Failed to create the trade order.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="rounded-[2rem] border border-border bg-card p-8 text-sm text-muted-foreground">
          Loading asset room...
        </div>
      </div>
    );
  }

  if (error || !state || !property) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-12">
        <div className="rounded-[2rem] border border-destructive/30 bg-destructive/10 p-8 text-sm text-destructive">
          {error ?? "Asset not found."}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <Link href="/marketplace" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
        Back to marketplace
      </Link>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.25fr,0.75fr]">
        <section className="space-y-6">
          <div className="rounded-[2rem] border border-border bg-card p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground">{property.heroTag}</p>
                <h1 className="mt-3 text-4xl font-semibold tracking-tight text-foreground">{property.name}</h1>
                <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    {property.city}, {property.state}
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    {property.symbol}
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <Clock3 className="h-4 w-4" />
                    {property.expectedExitMonths} month target hold
                  </span>
                </div>
              </div>
              <StatusBadge value={property.status} />
            </div>

            <p className="mt-6 max-w-3xl text-sm leading-7 text-muted-foreground">{property.summary}</p>

            <div className="mt-6 grid gap-3 md:grid-cols-4">
              <div className="rounded-2xl bg-background p-4">
                <p className="text-xs text-muted-foreground">{property.assetClassLabel}</p>
                <p className="mt-2 text-lg font-semibold text-foreground">{property.assetType}</p>
              </div>
              <div className="rounded-2xl bg-background p-4">
                <p className="text-xs text-muted-foreground">Minimum ticket</p>
                <p className="mt-2 text-lg font-semibold text-foreground">{formatInr(property.minimumInvestmentInrMinor)}</p>
              </div>
              <div className="rounded-2xl bg-background p-4">
                <p className="text-xs text-muted-foreground">Unit price</p>
                <p className="mt-2 text-lg font-semibold text-foreground">{formatInr(property.unitPriceInrMinor)}</p>
              </div>
              <div className="rounded-2xl bg-background p-4">
                <p className="text-xs text-muted-foreground">Target IRR</p>
                <p className="mt-2 text-lg font-semibold text-foreground">{formatPercent(property.targetIrrBps)}</p>
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] border border-border bg-card p-8">
            <h2 className="text-2xl font-semibold text-foreground">Asset room</h2>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {state.documents.map((document) => (
                <a
                  key={document.id}
                  href={document.url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-2xl border border-border bg-background p-4 transition-colors hover:border-ring/40"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-foreground">{document.name}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{document.category}</p>
                    </div>
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <p className="mt-4 text-xs text-muted-foreground">Updated {formatDate(document.updatedAt)}</p>
                </a>
              ))}
            </div>
          </div>
        </section>

        <aside className="space-y-6">
          <div className="rounded-[2rem] border border-border bg-card p-6">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-xl font-semibold text-foreground">Primary issue</h2>
              <StatusBadge value={property.status} />
            </div>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              KYC-approved investors create a fixed-price primary order here and then complete the mock UPI payment from
              the Payments workspace.
            </p>
            <label className="mt-5 block text-sm font-medium text-muted-foreground">
              Units
              <input
                type="number"
                min="1"
                value={primaryUnits}
                onChange={(event) => setPrimaryUnits(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition-colors focus:border-ring"
              />
            </label>
            <div className="mt-4 rounded-2xl bg-background p-4">
              <p className="text-xs text-muted-foreground">Estimated payment</p>
              <p className="mt-2 text-lg font-semibold text-foreground">{formatInr(totalPrimaryAmount)}</p>
            </div>
            {user?.kycStatus !== "approved" ? (
              <div className="mt-4 rounded-2xl border border-secondary/30 bg-secondary/15 p-4 text-sm text-secondary-foreground">
                Complete KYC before creating a subscription.
              </div>
            ) : null}
            <button
              onClick={submitPrimaryOrder}
              disabled={submitting || user?.kycStatus !== "approved"}
              className="mt-4 w-full rounded-2xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              Create primary buy order
            </button>
          </div>

          <div className="rounded-[2rem] border border-border bg-card p-6">
            <h2 className="text-xl font-semibold text-foreground">Secondary listings</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Listings are fixed-price seller offers. Buying creates a secondary order that settles through the local worker onto localnet.
            </p>

            <div className="mt-5 space-y-4">
              {state.listings.length === 0 ? (
                <div className="rounded-2xl bg-background p-4 text-sm text-muted-foreground">
                  No active listings yet for this asset.
                </div>
              ) : (
                state.listings.map((listing) => (
                  <div key={listing.id} className="rounded-2xl border border-border bg-background p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium text-foreground">{listing.sellerName}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {listing.unitsRemaining} of {listing.unitsListed} units remaining
                        </p>
                      </div>
                      <StatusBadge value={listing.status} />
                    </div>
                    <div className="mt-4 flex items-center gap-3">
                      <div className="rounded-xl bg-card px-3 py-2 text-sm text-foreground">
                        {formatInr(listing.pricePerUnitInrMinor)} / unit
                      </div>
                      <input
                        type="number"
                        min="1"
                        max={listing.unitsRemaining}
                        value={tradeUnits[listing.id] ?? ""}
                        onChange={(event) =>
                          setTradeUnits((current) => ({
                            ...current,
                            [listing.id]: event.target.value,
                          }))
                        }
                        placeholder="Units"
                        className="w-28 rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-ring"
                      />
                      <button
                        onClick={() => submitSecondaryOrder(listing)}
                        disabled={submitting || user?.kycStatus !== "approved"}
                        className="rounded-xl border border-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-card disabled:opacity-60"
                      >
                        Buy listing
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-[2rem] border border-border bg-card p-6">
            <h2 className="text-xl font-semibold text-foreground">Recent chain trades</h2>
            <div className="mt-4 space-y-3">
              {state.trades.length === 0 ? (
                <div className="rounded-2xl bg-background p-4 text-sm text-muted-foreground">
                  No settled on-chain trades yet for this asset.
                </div>
              ) : (
                state.trades.map((trade) => (
                  <div key={trade.id} className="rounded-2xl bg-background p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {trade.sellerName ?? "Seller"} sold to {trade.buyerName ?? "Buyer"}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {trade.units} units at {formatInr(trade.pricePerUnitInrMinor)} each
                        </p>
                      </div>
                      <StatusBadge value={trade.status} />
                    </div>
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <div className="rounded-xl border border-border bg-card px-3 py-2 text-xs text-muted-foreground">
                        Settled {formatDate(trade.settledAt)}
                      </div>
                      <div className="rounded-xl border border-border bg-card px-3 py-2 text-xs text-muted-foreground">
                        Trade record {compactAddress(trade.onChainAddress)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-[2rem] border border-border bg-card p-6">
            <h2 className="text-xl font-semibold text-foreground">Issue structure</h2>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-muted-foreground">
              <li>{property.structureLabel}: {property.structureName}</li>
              <li>{property.registrationLabel}: {property.registrationRef}</li>
              <li>{property.marketSegmentLabel}: {property.marketSegment}</li>
              <li>Units available: {property.availableUnits}</li>
              <li>Last publish date: {formatDate(property.liveAt)}</li>
              <li>Active secondary listings: {state.listings.length}</li>
              <li>Property PDA: {compactAddress(property.onChainPropertyAddress)}</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}

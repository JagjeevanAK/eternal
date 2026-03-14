"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { Building2, Clock3, ExternalLink, FileText, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/product-api";
import { EmptyState, Notice, ScreenHeader } from "@/features/exchange/components/ExchangePrimitives";
import { StatusBadge } from "@/features/exchange/components/StatusBadge";
import { useSession } from "@/features/exchange/context/SessionContext";
import {
  formatDate,
  formatDateTime,
  formatInr,
  formatPercent,
  formatSol,
  formatUnits,
  minimumPrimaryUnits,
  truncateAddress,
} from "@/features/exchange/lib/format";
import type { PortfolioResponse, PropertyDetailResponse } from "@/features/exchange/types";
import { inrMinorToSol } from "@/lib/solana-pricing";
import { cn } from "@/lib/utils";

const toPositiveInteger = (value: string) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

export function PropertyDetailScreen({ slug }: { slug: string }) {
  const { token, user } = useSession();
  const [state, setState] = useState<PropertyDetailResponse | null>(null);
  const [portfolio, setPortfolio] = useState<PortfolioResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [portfolioLoading, setPortfolioLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [primaryUnits, setPrimaryUnits] = useState("");
  const [sellUnits, setSellUnits] = useState("");
  const [sellPrice, setSellPrice] = useState("");
  const [tradeUnits, setTradeUnits] = useState<Record<string, string>>({});
  const [tradeTab, setTradeTab] = useState<"primary" | "secondary">("primary");

  const loadProperty = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiFetch<PropertyDetailResponse>(`/properties/${slug}`);
      setState(response);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load the asset.");
    } finally {
      setLoading(false);
    }
  }, [slug]);

  const loadPortfolio = useCallback(async () => {
    if (!token) {
      setPortfolio(null);
      return;
    }

    setPortfolioLoading(true);

    try {
      const response = await apiFetch<PortfolioResponse>("/portfolio", { token });
      setPortfolio(response);
    } catch {
      setPortfolio(null);
    } finally {
      setPortfolioLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadProperty();
  }, [loadProperty]);

  useEffect(() => {
    void loadPortfolio();
  }, [loadPortfolio]);

  useEffect(() => {
    if (!state?.property) {
      return;
    }

    setPrimaryUnits(
      String(
        minimumPrimaryUnits(
          state.property.minimumInvestmentInrMinor,
          state.property.unitPriceInrMinor,
        ),
      ),
    );
    setSellPrice(String(state.property.unitPriceInrMinor));
  }, [state?.property]);

  const property = state?.property ?? null;
  const selectedHolding =
    portfolio?.holdings.find((holding) => holding.propertyId === property?.id) ?? null;
  const availableToList = Math.max(
    0,
    (selectedHolding?.units ?? 0) - (selectedHolding?.listedUnits ?? 0),
  );
  const userCanTrade = user?.role === "investor" && user.kycStatus === "approved";
  const hasBoundWallet = Boolean(user?.externalWalletAddress);
  const secondaryAvailable = Boolean((state?.listings.length ?? 0) || selectedHolding);

  const primaryAmount = useMemo(
    () => (toPositiveInteger(primaryUnits) ?? 0) * (property?.unitPriceInrMinor ?? 0),
    [primaryUnits, property?.unitPriceInrMinor],
  );
  const primaryAmountSol = useMemo(() => inrMinorToSol(primaryAmount), [primaryAmount]);

  useEffect(() => {
    if (!secondaryAvailable && tradeTab === "secondary") {
      setTradeTab("primary");
    }
  }, [secondaryAvailable, tradeTab]);

  async function runAction(
    key: string,
    task: () => Promise<void>,
    successMessage: string,
    options: { refreshPortfolio?: boolean } = {},
  ) {
    setPendingAction(key);
    setActionError(null);
    setActionMessage(null);

    try {
      await task();
      setActionMessage(successMessage);
      await loadProperty();
      if (options.refreshPortfolio) {
        await loadPortfolio();
      }
    } catch (taskError) {
      setActionError(taskError instanceof Error ? taskError.message : "Action failed.");
    } finally {
      setPendingAction(null);
    }
  }

  async function handlePrimaryOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!token || !property) {
      return;
    }

    const units = toPositiveInteger(primaryUnits);
    if (!units) {
      setActionError("Enter a valid whole-number unit count.");
      setActionMessage(null);
      return;
    }

    await runAction(
      "primary-order",
      () =>
        apiFetch("/orders/primary", {
          method: "POST",
          token,
          body: { propertyId: property.id, units },
        }),
      `Primary order created for ${formatUnits(units)} units. Complete payment from the Payments route.`,
      { refreshPortfolio: true },
    );
  }

  async function handleCreateListing(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!token || !property) {
      return;
    }

    const units = toPositiveInteger(sellUnits);
    const pricePerUnitInrMinor = toPositiveInteger(sellPrice);

    if (!units || !pricePerUnitInrMinor) {
      setActionError("Enter valid units and a valid per-unit price.");
      setActionMessage(null);
      return;
    }

    await runAction(
      "create-listing",
      () =>
        apiFetch("/listings", {
          method: "POST",
          token,
          body: { propertyId: property.id, units, pricePerUnitInrMinor },
        }),
      `Listing published for ${formatUnits(units)} units at ${formatInr(pricePerUnitInrMinor)} per unit.`,
      { refreshPortfolio: true },
    );
  }

  async function handleBuyListing(listingId: string) {
    if (!token) {
      return;
    }

    const units = toPositiveInteger(tradeUnits[listingId] ?? "1");
    if (!units) {
      setActionError("Enter a valid trade size before buying a listing.");
      setActionMessage(null);
      return;
    }

    await runAction(
      `buy-listing:${listingId}`,
      () =>
        apiFetch(`/listings/${listingId}/buy`, {
          method: "POST",
          token,
          body: { units },
        }),
      `Secondary order created for ${formatUnits(units)} units. Complete payment from the Payments route.`,
      { refreshPortfolio: true },
    );
  }

  if (loading) {
    return (
      <Card className="border-border bg-card/92 shadow-2xl backdrop-blur">
        <CardContent className="px-6 py-10 text-sm text-muted-foreground">
          Loading asset room...
        </CardContent>
      </Card>
    );
  }

  if (error || !state || !property) {
    return <Notice tone="error">{error ?? "Asset not found."}</Notice>;
  }

  return (
    <div className="space-y-6">
      <ScreenHeader
        eyebrow="Asset room"
        title={property.name}
        description={property.summary}
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/marketplace">Back to marketplace</Link>
            </Button>
            <Badge variant="secondary">{property.symbol}</Badge>
          </>
        }
      />

      {actionError ? <Notice tone="error">{actionError}</Notice> : null}
      {actionMessage ? <Notice tone="success">{actionMessage}</Notice> : null}

      <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
        <section className="space-y-6">
          <Card className="border-border bg-card/92 shadow-2xl backdrop-blur">
            <CardContent className="space-y-6 px-6 py-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <Badge variant="muted">{property.heroTag}</Badge>
                  <h2 className="mt-4 text-4xl font-semibold tracking-tight text-foreground">
                    {property.name}
                  </h2>
                  <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      {property.city}, {property.state}
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      {property.assetType}
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <Clock3 className="h-4 w-4" />
                      {property.expectedExitMonths} month target hold
                    </span>
                  </div>
                </div>
                <StatusBadge value={property.status} />
              </div>

              <div className="grid gap-3 md:grid-cols-4">
                <div className="rounded-[1.2rem] border border-border bg-card/80 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    Minimum ticket
                  </p>
                  <p className="mt-2 text-lg font-semibold text-foreground">
                    {formatInr(property.minimumInvestmentInrMinor)}
                  </p>
                </div>
                <div className="rounded-[1.2rem] border border-border bg-card/80 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    Unit price
                  </p>
                  <p className="mt-2 text-lg font-semibold text-foreground">
                    {formatInr(property.unitPriceInrMinor)}
                  </p>
                </div>
                <div className="rounded-[1.2rem] border border-border bg-card/80 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    Target IRR
                  </p>
                  <p className="mt-2 text-lg font-semibold text-foreground">
                    {formatPercent(property.targetIrrBps)}
                  </p>
                </div>
                <div className="rounded-[1.2rem] border border-border bg-card/80 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    Active listings
                  </p>
                  <p className="mt-2 text-lg font-semibold text-foreground">
                    {formatUnits(property.activeListingUnits)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card/92 shadow-2xl backdrop-blur">
            <CardHeader>
              <CardTitle className="text-2xl">Documents</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              {state.documents.length ? (
                state.documents.map((document) => (
                  <a
                    key={document.id}
                    href={document.url}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-[1.3rem] border border-border bg-card/80 p-4 transition-colors hover:border-primary/20"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-foreground">{document.name}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{document.category}</p>
                      </div>
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <p className="mt-3 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                      Updated {formatDate(document.updatedAt)}
                    </p>
                  </a>
                ))
              ) : (
                <EmptyState
                  title="No approved documents"
                  description="The asset does not currently expose approved diligence files."
                />
              )}
            </CardContent>
          </Card>

          <Card className="border-border bg-card/92 shadow-2xl backdrop-blur">
            <CardHeader>
              <CardTitle className="text-2xl">Recent trades</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {state.trades.length ? (
                state.trades.map((trade) => (
                  <div
                    key={trade.id}
                    className="rounded-[1.3rem] border border-border bg-card/80 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-foreground">
                          {trade.buyerName ?? "Buyer"} bought from {trade.sellerName ?? "Seller"}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {formatUnits(trade.units)} units at {formatInr(trade.pricePerUnitInrMinor)} each
                        </p>
                      </div>
                      <StatusBadge value={trade.status} />
                    </div>
                    <div className="mt-3 grid gap-2 text-sm text-muted-foreground">
                      <div className="flex items-center justify-between gap-3">
                        <span>Total</span>
                        <span className="font-semibold text-foreground">
                          {formatInr(trade.totalAmountInrMinor)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span>Settled</span>
                        <span className="font-medium text-foreground">
                          {formatDateTime(trade.settledAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState
                  title="No completed trades"
                  description="Settled secondary fills will appear here once buyers complete payment."
                />
              )}
            </CardContent>
          </Card>
        </section>

        <aside className="space-y-6">
          <Card className="border-border bg-card/92 shadow-2xl backdrop-blur">
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-2xl">Trade</CardTitle>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setTradeTab("primary")}
                    className={cn(
                      "rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                      tradeTab === "primary"
                        ? "border-primary/20 bg-primary/10 text-primary"
                        : "border-border bg-card/80 text-muted-foreground hover:text-foreground",
                    )}
                  >
                    Primary
                  </button>
                  {secondaryAvailable ? (
                    <button
                      type="button"
                      onClick={() => setTradeTab("secondary")}
                      className={cn(
                        "rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                        tradeTab === "secondary"
                          ? "border-primary/20 bg-primary/10 text-primary"
                          : "border-border bg-card/80 text-muted-foreground hover:text-foreground",
                      )}
                    >
                      Secondary
                    </button>
                  ) : null}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {tradeTab === "primary" ? (
                <>
                  <p className="text-sm leading-6 text-muted-foreground">
                    Approved investor accounts can create a primary order here and then complete payment from the
                    Payments route with Phantom localnet SOL or the demo INR rail.
                  </p>
                  {userCanTrade ? (
                    <form onSubmit={handlePrimaryOrder} className="space-y-3">
                      <Input
                        value={primaryUnits}
                        onChange={(event) => setPrimaryUnits(event.target.value)}
                        inputMode="numeric"
                        placeholder="Units"
                      />
                      <div className="rounded-[1.2rem] border border-border bg-card/80 px-4 py-3 text-sm text-muted-foreground">
                        Estimated payment{" "}
                        <span className="font-semibold text-foreground">
                          {formatInr(primaryAmount)} · {formatSol(primaryAmountSol)}
                        </span>
                      </div>
                      <Button type="submit" className="w-full" disabled={pendingAction !== null}>
                        {pendingAction === "primary-order" ? "Creating order..." : "Create primary order"}
                      </Button>
                    </form>
                  ) : (
                    <EmptyState
                      title={user ? "Trading locked" : "Sign in required"}
                      description={
                        user
                          ? "Investor accounts need approved KYC before placing orders."
                          : "Sign in as an investor to create a primary order."
                      }
                    />
                  )}
                </>
              ) : (
                <>
                  {userCanTrade ? (
                    <form onSubmit={handleCreateListing} className="space-y-3 rounded-[1.3rem] border border-border bg-card/80 p-4">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Input
                          value={sellUnits}
                          onChange={(event) => setSellUnits(event.target.value)}
                          inputMode="numeric"
                          placeholder={`Units to list${availableToList ? ` (max ${availableToList})` : ""}`}
                        />
                        <Input
                          value={sellPrice}
                          onChange={(event) => setSellPrice(event.target.value)}
                          inputMode="numeric"
                          placeholder="Price per unit"
                        />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {portfolioLoading
                          ? "Checking available holdings..."
                          : selectedHolding
                            ? `Available to list: ${formatUnits(availableToList)} of ${formatUnits(selectedHolding.units)} units.`
                            : "No holdings detected for this asset yet."}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Sale proceeds from Phantom localnet trades settle to the wallet bound on your KYC profile.
                      </p>
                      {!hasBoundWallet ? (
                        <p className="text-sm text-muted-foreground">
                          Bind a wallet on the KYC page before publishing a listing.
                        </p>
                      ) : null}
                      <Button
                        type="submit"
                        variant="outline"
                        className="w-full"
                        disabled={pendingAction !== null || !selectedHolding || !hasBoundWallet}
                      >
                        {pendingAction === "create-listing" ? "Publishing..." : "Publish secondary listing"}
                      </Button>
                    </form>
                  ) : null}

                  {state.listings.length ? (
                    state.listings.map((listing) => {
                      const disabled =
                        pendingAction !== null || !userCanTrade || listing.sellerId === user?.id;

                      return (
                        <div
                          key={listing.id}
                          className="rounded-[1.3rem] border border-border bg-card/80 p-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-medium text-foreground">{listing.sellerName}</p>
                              <p className="mt-1 text-sm text-muted-foreground">
                                {formatUnits(listing.unitsRemaining)} units at {formatInr(listing.pricePerUnitInrMinor)} each
                                {" "}· {formatSol(inrMinorToSol(listing.pricePerUnitInrMinor))} each
                              </p>
                            </div>
                            <StatusBadge value={listing.status} />
                          </div>
                          <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
                            <Input
                              value={tradeUnits[listing.id] ?? "1"}
                              onChange={(event) =>
                                setTradeUnits((current) => ({
                                  ...current,
                                  [listing.id]: event.target.value,
                                }))
                              }
                              inputMode="numeric"
                            />
                            <Button
                              type="button"
                              onClick={() => void handleBuyListing(listing.id)}
                              disabled={disabled}
                            >
                              {listing.sellerId === user?.id
                                ? "Your listing"
                                : pendingAction === `buy-listing:${listing.id}`
                                  ? "Creating..."
                                  : "Buy listing"}
                            </Button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <EmptyState
                      title="No active listings"
                      description="There are no live seller offers for this asset yet."
                    />
                  )}
                </>
              )}
            </CardContent>
          </Card>

          <Card className="border-border bg-card/92 shadow-2xl backdrop-blur">
            <CardHeader>
              <CardTitle className="text-2xl">Chain metadata</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <div className="flex items-center justify-between gap-3">
                <span>Property account</span>
                <span className="font-medium text-foreground">
                  {truncateAddress(property.onChainPropertyAddress)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Offering account</span>
                <span className="font-medium text-foreground">
                  {truncateAddress(property.onChainOfferingAddress)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Last chain sync</span>
                <span className="font-medium text-foreground">
                  {formatDateTime(property.lastChainSyncAt)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Registration</span>
                <span className="font-medium text-foreground">{property.registrationRef}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Issue structure</span>
                <span className="font-medium text-foreground">{property.structureName}</span>
              </div>
              {state.documents[0] ? (
                <a
                  href={state.documents[0].url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-primary transition-colors hover:text-primary/80"
                >
                  Open latest approved document
                  <ExternalLink className="h-4 w-4" />
                </a>
              ) : null}
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}

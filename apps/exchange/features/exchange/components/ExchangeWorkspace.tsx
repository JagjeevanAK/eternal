"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  Blocks,
  CircleDollarSign,
  Coins,
  ExternalLink,
  Landmark,
  LogOut,
  RefreshCcw,
  ShieldCheck,
  ShoppingCart,
  WalletCards,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { API_BASE_URL, ApiError, apiFetch } from "@/lib/product-api";
import { useSession } from "@/features/exchange/context/SessionContext";
import {
  formatDate,
  formatDateTime,
  formatInr,
  formatPercent,
  formatRole,
  formatUnits,
  minimumPrimaryUnits,
  truncateAddress,
} from "@/features/exchange/lib/format";
import type {
  DashboardResponse,
  Holding,
  KycRecord,
  OrderRecord,
  PaymentsResponse,
  PortfolioResponse,
  PropertyDetailResponse,
  PropertySummary,
} from "@/features/exchange/types";

const PROGRAM_ID = "EjLLVvxkMtssALhHv4dvKhkxYJQKGmMUcB38DboGMYtJ";
const CLUSTER_LABEL = process.env.NEXT_PUBLIC_SOLANA_CLUSTER ?? "localnet";
const RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? "http://127.0.0.1:8899";
const POLL_INTERVAL_MS = 5000;
const SETTLEMENT_REFRESH_MS = 2200;

const statusTone = (value: string) => {
  if (["approved", "settled", "paid", "live"].includes(value)) {
    return "border-emerald-500/20 bg-emerald-500/10 text-emerald-700";
  }

  if (["active", "filled", "partially_filled"].includes(value)) {
    return "border-sky-500/20 bg-sky-500/10 text-sky-700";
  }

  if (["pending", "review", "awaiting_payment", "settlement_pending"].includes(value)) {
    return "border-amber-500/20 bg-amber-500/10 text-amber-700";
  }

  if (["rejected", "cancelled", "failed", "closed"].includes(value)) {
    return "border-rose-500/20 bg-rose-500/10 text-rose-700";
  }

  return "border-border bg-muted text-muted-foreground";
};

const toPositiveInteger = (value: string) => {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
};

const errorMessage = (value: unknown, fallback: string) =>
  value instanceof Error ? value.message : fallback;

function MetricTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-[1.4rem] border border-border bg-card/80 p-4 shadow-lg">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-foreground">{value}</p>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{hint}</p>
    </div>
  );
}

function EmptyPanel({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-[1.4rem] border border-dashed border-border/80 bg-muted/30 px-4 py-5">
      <p className="font-medium text-foreground">{title}</p>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{body}</p>
    </div>
  );
}

export function ExchangeWorkspace() {
  const { bindWallet, loading: sessionLoading, logout, refreshSession, token, user } =
    useSession();

  const [properties, setProperties] = useState<PropertySummary[]>([]);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<PropertyDetailResponse | null>(null);
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [portfolio, setPortfolio] = useState<PortfolioResponse | null>(null);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [payments, setPayments] = useState<PaymentsResponse | null>(null);
  const [kycRecord, setKycRecord] = useState<KycRecord | null>(null);
  const [publicLoading, setPublicLoading] = useState(true);
  const [privateLoading, setPrivateLoading] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionPending, setActionPending] = useState<string | null>(null);
  const [walletAddress, setWalletAddress] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [investUnits, setInvestUnits] = useState("");
  const [sellUnits, setSellUnits] = useState("");
  const [sellPrice, setSellPrice] = useState("");
  const [listingOrderSizes, setListingOrderSizes] = useState<Record<string, string>>({});
  const [kycForm, setKycForm] = useState({
    panMasked: "",
    aadhaarMasked: "",
    occupation: "",
    annualIncomeBand: "",
  });
  const syncedPropertyIdRef = useRef<string | null>(null);
  const syncedKycRecordIdRef = useRef<string | null>(null);

  const filteredProperties = properties.filter((property) => {
    const candidate = [
      property.name,
      property.symbol,
      property.city,
      property.state,
      property.assetType,
      property.marketSegment,
      property.issuerName,
    ]
      .join(" ")
      .toLowerCase();

    return candidate.includes(searchQuery.trim().toLowerCase());
  });

  const selectedProperty =
    selectedAsset?.property ??
    properties.find((property) => property.slug === selectedSlug) ??
    null;

  const selectedHolding =
    portfolio?.holdings.find((holding) => holding.propertyId === selectedProperty?.id) ?? null;
  const availableToList = Math.max(
    0,
    (selectedHolding?.units ?? 0) - (selectedHolding?.listedUnits ?? 0),
  );
  const userCanTrade = user?.role === "investor" && user.kycStatus === "approved";
  const investorNeedsKyc =
    user?.role === "investor" && user.kycStatus !== "approved";
  const chainSyncedAssets = properties.filter((property) => property.onChainPropertyAddress).length;
  const totalListingUnits = properties.reduce(
    (sum, property) => sum + property.activeListingUnits,
    0,
  );
  const averageYieldBps =
    properties.length === 0
      ? 0
      : Math.round(
          properties.reduce((sum, property) => sum + property.targetYieldBps, 0) /
            properties.length,
        );

  const loadProperties = useCallback(async (showSpinner = false) => {
    if (showSpinner) {
      setPublicLoading(true);
    }

    try {
      const response = await apiFetch<{ properties: PropertySummary[] }>("/properties");
      setProperties(response.properties);
      setConnectionError(null);
    } catch (loadError) {
      setConnectionError(
        errorMessage(
          loadError,
          "Exchange API is unavailable. Start apps/api and apps/worker, then refresh.",
        ),
      );
    } finally {
      if (showSpinner) {
        setPublicLoading(false);
      }
    }
  }, []);

  const loadSelectedAsset = useCallback(async (slug: string, showSpinner = false) => {
    if (showSpinner) {
      setPublicLoading(true);
    }

    try {
      const response = await apiFetch<PropertyDetailResponse>(`/properties/${slug}`);
      setSelectedAsset(response);
      setConnectionError(null);
    } catch (loadError) {
      setSelectedAsset(null);
      setConnectionError(
        errorMessage(loadError, "Failed to load the selected asset from the exchange."),
      );
    } finally {
      if (showSpinner) {
        setPublicLoading(false);
      }
    }
  }, []);

  const loadPrivateData = useCallback(async () => {
    if (!token) {
      setDashboard(null);
      setPortfolio(null);
      setOrders([]);
      setPayments(null);
      setKycRecord(null);
      return;
    }

    setPrivateLoading(true);

    try {
      const [dashboardResponse, portfolioResponse, ordersResponse, paymentsResponse, kycResponse] =
        await Promise.all([
          apiFetch<DashboardResponse>("/dashboard", { token }),
          apiFetch<PortfolioResponse>("/portfolio", { token }),
          apiFetch<{ orders: OrderRecord[] }>("/orders", { token }),
          apiFetch<PaymentsResponse>("/payments", { token }),
          apiFetch<{ record: KycRecord | null }>("/kyc", { token }),
        ]);

      setDashboard(dashboardResponse);
      setPortfolio(portfolioResponse);
      setOrders(ordersResponse.orders);
      setPayments(paymentsResponse);
      setKycRecord(kycResponse.record);
      setConnectionError(null);
    } catch (loadError) {
      if (loadError instanceof ApiError && loadError.status === 401) {
        await refreshSession();
        return;
      }

      setConnectionError(
        errorMessage(loadError, "Failed to refresh your exchange account state."),
      );
    } finally {
      setPrivateLoading(false);
    }
  }, [refreshSession, token]);

  const refreshAll = useCallback(async () => {
    await loadProperties();

    if (selectedSlug) {
      await loadSelectedAsset(selectedSlug);
    }

    if (token) {
      await loadPrivateData();
    }
  }, [loadPrivateData, loadProperties, loadSelectedAsset, selectedSlug, token]);

  function scheduleSettlementRefresh() {
    window.setTimeout(() => {
      void refreshAll();
    }, SETTLEMENT_REFRESH_MS);
  }

  async function runAction(
    key: string,
    task: () => Promise<void>,
    successText: string,
    options: { refreshAfterSettlement?: boolean } = {},
  ) {
    setActionPending(key);
    setActionError(null);
    setActionMessage(null);

    try {
      await task();
      setActionMessage(successText);
      await refreshAll();

      if (options.refreshAfterSettlement) {
        scheduleSettlementRefresh();
      }
    } catch (taskError) {
      setActionError(errorMessage(taskError, "The action could not be completed."));
    } finally {
      setActionPending(null);
    }
  }

  async function handlePrimaryOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!token || !selectedProperty) {
      return;
    }

    const units = toPositiveInteger(investUnits);

    if (!units) {
      setActionError("Enter a whole-number unit count for the primary order.");
      setActionMessage(null);
      return;
    }

    await runAction(
      "primary-order",
      async () => {
        await apiFetch("/orders/primary", {
          method: "POST",
          token,
          body: { propertyId: selectedProperty.id, units },
        });
      },
      `Primary order created for ${formatUnits(units)} units. Capture the pending payment to settle it on localnet.`,
    );
  }

  async function handleListing(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!token || !selectedProperty) {
      return;
    }

    const units = toPositiveInteger(sellUnits);
    const pricePerUnitInrMinor = toPositiveInteger(sellPrice);

    if (!units || !pricePerUnitInrMinor) {
      setActionError("Enter valid units and a per-unit listing price.");
      setActionMessage(null);
      return;
    }

    await runAction(
      "create-listing",
      async () => {
        await apiFetch("/listings", {
          method: "POST",
          token,
          body: {
            propertyId: selectedProperty.id,
            units,
            pricePerUnitInrMinor,
          },
        });
      },
      `Secondary listing published for ${formatUnits(units)} units at ${formatInr(pricePerUnitInrMinor)} per unit.`,
    );
  }

  async function handleListingBuy(listingId: string) {
    if (!token) {
      return;
    }

    const units = toPositiveInteger(listingOrderSizes[listingId] ?? "1");

    if (!units) {
      setActionError("Enter a valid trade size before buying a listing.");
      setActionMessage(null);
      return;
    }

    await runAction(
      `buy-listing:${listingId}`,
      async () => {
        await apiFetch(`/listings/${listingId}/buy`, {
          method: "POST",
          token,
          body: { units },
        });
      },
      `Secondary order created for ${formatUnits(units)} units. Complete the payment to trigger settlement.`,
    );
  }

  async function handlePayment(paymentId: string) {
    if (!token) {
      return;
    }

    await runAction(
      `pay:${paymentId}`,
      async () => {
        await apiFetch(`/payments/${paymentId}/pay`, {
          method: "POST",
          token,
        });
      },
      "Mock INR payment captured. The worker will settle the order into the program shortly.",
      { refreshAfterSettlement: true },
    );
  }

  async function handleWalletBind(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!walletAddress.trim()) {
      setActionError("Enter the Solana wallet address you want to bind.");
      setActionMessage(null);
      return;
    }

    await runAction(
      "bind-wallet",
      async () => {
        await bindWallet(walletAddress.trim());
      },
      "External wallet bound to the investor profile.",
    );
  }

  async function handleKycSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!token) {
      return;
    }

    if (
      !kycForm.panMasked.trim() ||
      !kycForm.aadhaarMasked.trim() ||
      !kycForm.occupation.trim() ||
      !kycForm.annualIncomeBand.trim()
    ) {
      setActionError("Complete all KYC fields before submitting.");
      setActionMessage(null);
      return;
    }

    await runAction(
      "submit-kyc",
      async () => {
        await apiFetch("/kyc/submit", {
          method: "POST",
          token,
          body: {
            panMasked: kycForm.panMasked.trim(),
            aadhaarMasked: kycForm.aadhaarMasked.trim(),
            occupation: kycForm.occupation.trim(),
            annualIncomeBand: kycForm.annualIncomeBand.trim(),
          },
        });
      },
      "KYC submitted for review. Use the admin app to approve it for immediate trading access.",
    );
  }

  useEffect(() => {
    void loadProperties(true);
  }, [loadProperties]);

  useEffect(() => {
    if (!properties.length) {
      return;
    }

    const stillExists = selectedSlug
      ? properties.some((property) => property.slug === selectedSlug)
      : false;

    if (!selectedSlug || !stillExists) {
      setSelectedSlug(properties[0].slug);
    }
  }, [properties, selectedSlug]);

  useEffect(() => {
    if (!selectedSlug) {
      return;
    }

    void loadSelectedAsset(selectedSlug, true);
  }, [loadSelectedAsset, selectedSlug]);

  useEffect(() => {
    if (!token) {
      setDashboard(null);
      setPortfolio(null);
      setOrders([]);
      setPayments(null);
      setKycRecord(null);
      return;
    }

    void loadPrivateData();
  }, [loadPrivateData, token]);

  useEffect(() => {
    if (!selectedProperty) {
      syncedPropertyIdRef.current = null;
      return;
    }

    if (syncedPropertyIdRef.current === selectedProperty.id) {
      return;
    }

    syncedPropertyIdRef.current = selectedProperty.id;
    setInvestUnits(
      String(
        minimumPrimaryUnits(
          selectedProperty.minimumInvestmentInrMinor,
          selectedProperty.unitPriceInrMinor,
        ),
      ),
    );
    setSellUnits("");
    setSellPrice(String(selectedProperty.unitPriceInrMinor));
    setListingOrderSizes({});
  }, [selectedProperty]);

  useEffect(() => {
    setWalletAddress(user?.externalWalletAddress ?? "");
  }, [user?.externalWalletAddress]);

  useEffect(() => {
    if (!kycRecord) {
      if (syncedKycRecordIdRef.current !== null) {
        syncedKycRecordIdRef.current = null;
        setKycForm({
          panMasked: "",
          aadhaarMasked: "",
          occupation: "",
          annualIncomeBand: "",
        });
      }
      return;
    }

    if (syncedKycRecordIdRef.current === kycRecord.id) {
      return;
    }

    syncedKycRecordIdRef.current = kycRecord.id;
    setKycForm({
      panMasked: kycRecord.panMasked,
      aadhaarMasked: kycRecord.aadhaarMasked,
      occupation: kycRecord.occupation,
      annualIncomeBand: kycRecord.annualIncomeBand,
    });
  }, [kycRecord]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      void loadProperties();

      if (selectedSlug) {
        void loadSelectedAsset(selectedSlug);
      }

      if (token) {
        void loadPrivateData();
      }
    }, POLL_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [loadPrivateData, loadProperties, loadSelectedAsset, selectedSlug, token]);

  return (
    <div className="min-h-screen bg-background px-4 py-6 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
          <Card className="overflow-hidden border-border bg-card/86 shadow-2xl backdrop-blur">
            <CardContent className="space-y-8 px-6 py-8 sm:px-8 sm:py-10">
              <div className="space-y-5">
                <Badge className="w-fit border-sky-500/20 bg-sky-500/10 text-sky-700">
                  Solana exchange rail
                </Badge>
                <div className="space-y-4">
                  <p className="text-sm font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                    Eternal Marketplace
                  </p>
                  <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
                    A live exchange surface for primary buying, secondary selling, and localnet settlement.
                  </h1>
                  <p className="max-w-3xl text-base leading-7 text-muted-foreground sm:text-lg">
                    The frontend talks to the local API, which syncs live offerings, listings, and
                    settlement events into the Anchor program. The worker completes paid orders
                    through `allocate_primary` and `fill_listing`.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <MetricTile
                  label="Live assets"
                  value={formatUnits(properties.length)}
                  hint={`${formatUnits(chainSyncedAssets)} already mirrored on ${CLUSTER_LABEL}.`}
                />
                <MetricTile
                  label="Listing inventory"
                  value={formatUnits(totalListingUnits)}
                  hint="Secondary units currently offered across the exchange."
                />
                <MetricTile
                  label="Avg target yield"
                  value={formatPercent(averageYieldBps)}
                  hint="Computed from the published live catalogue."
                />
                <MetricTile
                  label="Program"
                  value={truncateAddress(PROGRAM_ID, 6)}
                  hint={`${CLUSTER_LABEL} RPC ${truncateAddress(RPC_URL, 10)}`}
                />
              </div>

              <div className="flex flex-wrap gap-3">
                {user ? (
                  <Button asChild>
                    <Link href="#trade-panel">Trade selected asset</Link>
                  </Button>
                ) : (
                  <Button asChild>
                    <Link href="/login">Investor sign in</Link>
                  </Button>
                )}
                <Button asChild variant="outline">
                  <Link href="#marketplace">Browse live order book</Link>
                </Button>
                {user ? (
                  <Button
                    variant="outline"
                    onClick={() => void logout()}
                    className="gap-2"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </Button>
                ) : (
                  <Button asChild variant="outline">
                    <Link href="/signup">Create investor account</Link>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card/92 shadow-2xl backdrop-blur">
            <CardHeader className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-2xl">
                    {user ? "Investor session" : "Access status"}
                  </CardTitle>
                  <CardDescription className="mt-2 text-sm leading-6">
                    {user
                      ? "Your wallet binding, KYC state, and cash balance sit next to the market so trade readiness is obvious."
                      : "Public market data is open. Trading actions require an investor login and approved KYC."}
                  </CardDescription>
                </div>
                <Badge
                  variant="secondary"
                  className={cn(
                    user ? statusTone(user.kycStatus) : "border-border bg-muted text-muted-foreground",
                  )}
                >
                  {user ? formatRole(user.kycStatus) : "Guest"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              {user ? (
                <>
                  <div className="rounded-[1.5rem] border border-border/80 bg-muted/35 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-lg font-semibold text-foreground">{user.fullName}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {formatRole(user.role)} account
                        </p>
                      </div>
                      <Badge className={statusTone(user.kycStatus)}>
                        {formatRole(user.kycStatus)}
                      </Badge>
                    </div>
                    <div className="mt-4 grid gap-3 text-sm text-muted-foreground">
                      <div className="flex items-center justify-between gap-3">
                        <span>Cash balance</span>
                        <span className="font-semibold text-foreground">
                          {formatInr(user.cashBalanceInrMinor)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span>Managed wallet</span>
                        <span className="font-medium text-foreground">
                          {truncateAddress(user.managedWalletAddress)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span>External wallet</span>
                        <span className="font-medium text-foreground">
                          {truncateAddress(user.externalWalletAddress)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {dashboard ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <MetricTile
                        label="Active orders"
                        value={formatUnits(dashboard.stats.activeOrders)}
                        hint="Orders awaiting payment or settlement."
                      />
                      <MetricTile
                        label="Holdings"
                        value={formatUnits(dashboard.stats.holdings)}
                        hint="Distinct assets in the investor portfolio."
                      />
                    </div>
                  ) : (
                    <EmptyPanel
                      title="Loading investor summary"
                      body="Account metrics will appear here after the private exchange state refreshes."
                    />
                  )}
                </>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-[1.5rem] border border-primary/15 bg-primary/8 p-4">
                    <p className="font-semibold text-foreground">Investor-only execution</p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      You can inspect live assets without logging in. Creating buy orders, sell
                      listings, and payments requires an investor account.
                    </p>
                  </div>
                  <div className="grid gap-3">
                    <Button asChild>
                      <Link href="/login">Sign in to trade</Link>
                    </Button>
                    <Button asChild variant="outline">
                      <Link href="/signup">Create investor account</Link>
                    </Button>
                  </div>
                </div>
              )}

              <div className="rounded-[1.5rem] border border-foreground/10 bg-foreground px-4 py-4 text-background">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-background/70">
                  Contract path
                </p>
                <div className="mt-3 grid gap-2 text-sm text-background/90">
                  <div className="flex items-center justify-between gap-3">
                    <span>Primary</span>
                    <span>`allocate_primary`</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>Secondary listing</span>
                    <span>`create_listing`</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>Secondary fill</span>
                    <span>`fill_listing`</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {connectionError ? (
          <div className="rounded-[1.5rem] border border-rose-500/20 bg-rose-500/10 px-5 py-4 text-sm text-rose-700">
            {connectionError}
          </div>
        ) : null}

        {actionError ? (
          <div className="rounded-[1.5rem] border border-rose-500/20 bg-rose-500/10 px-5 py-4 text-sm text-rose-700">
            {actionError}
          </div>
        ) : null}

        {actionMessage ? (
          <div className="rounded-[1.5rem] border border-emerald-500/20 bg-emerald-500/10 px-5 py-4 text-sm text-emerald-700">
            {actionMessage}
          </div>
        ) : null}

        <section
          id="marketplace"
          className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]"
        >
          <Card className="border-border bg-card/92 shadow-2xl backdrop-blur">
            <CardHeader className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-2xl">Live assets</CardTitle>
                  <CardDescription className="mt-2 text-sm leading-6">
                    Published offerings and currently tradable tokenized inventory.
                  </CardDescription>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void refreshAll()}
                  disabled={publicLoading || privateLoading || sessionLoading}
                  className="gap-2"
                >
                  <RefreshCcw className="h-3.5 w-3.5" />
                  Refresh
                </Button>
              </div>
              <div className="space-y-2">
                <Label htmlFor="asset-search">Search the market</Label>
                <Input
                  id="asset-search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Whitefield, logistics, MONSOON..."
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {publicLoading && !properties.length ? (
                <EmptyPanel
                  title="Loading live catalogue"
                  body="The exchange is fetching public asset data and the latest localnet read model."
                />
              ) : filteredProperties.length ? (
                filteredProperties.map((property) => {
                  const isSelected = property.slug === selectedProperty?.slug;

                  return (
                    <button
                      key={property.id}
                      type="button"
                      onClick={() => setSelectedSlug(property.slug)}
                      className={cn(
                        "w-full rounded-[1.5rem] border px-4 py-4 text-left transition-all",
                        isSelected
                          ? "border-primary/25 bg-primary/8 shadow-lg"
                          : "border-border/80 bg-card hover:border-primary/20 hover:bg-muted/30",
                      )}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                            {property.heroTag}
                          </p>
                          <h2 className="mt-2 text-lg font-semibold text-foreground">
                            {property.name}
                          </h2>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {property.city}, {property.state} · {property.issuerName}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <Badge className={statusTone(property.status)}>
                            {formatRole(property.status)}
                          </Badge>
                          <Badge variant="muted">{property.symbol}</Badge>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-[1.2rem] border border-border bg-card/80 p-3">
                          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                            Unit price
                          </p>
                          <p className="mt-2 text-lg font-semibold text-foreground">
                            {formatInr(property.unitPriceInrMinor)}
                          </p>
                        </div>
                        <div className="rounded-[1.2rem] border border-border bg-card/80 p-3">
                          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                            Available units
                          </p>
                          <p className="mt-2 text-lg font-semibold text-foreground">
                            {formatUnits(property.availableUnits)}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                        <span>{property.assetClassLabel}</span>
                        <span>•</span>
                        <span>{property.marketSegment}</span>
                        <span>•</span>
                        <span>{property.riskBand}</span>
                        <span>•</span>
                        <span>{formatPercent(property.targetYieldBps)} yield</span>
                      </div>
                    </button>
                  );
                })
              ) : (
                <EmptyPanel
                  title="No matching assets"
                  body="Adjust the search terms or reset the local product state if you expected seeded assets here."
                />
              )}
            </CardContent>
          </Card>

          <Card
            id="trade-panel"
            className="border-border bg-card/92 shadow-2xl backdrop-blur"
          >
            <CardHeader className="space-y-4">
              {selectedProperty ? (
                <>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge>{selectedProperty.heroTag}</Badge>
                        <Badge className={statusTone(selectedProperty.status)}>
                          {formatRole(selectedProperty.status)}
                        </Badge>
                        <Badge variant="muted">{selectedProperty.symbol}</Badge>
                      </div>
                      <div>
                        <CardTitle className="text-2xl">{selectedProperty.name}</CardTitle>
                        <CardDescription className="mt-2 max-w-2xl text-sm leading-6">
                          {selectedProperty.summary}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="space-y-2 text-right">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                        Chain status
                      </p>
                      <p className="text-sm font-medium text-foreground">
                        {selectedProperty.onChainPropertyAddress ? "Synced to localnet" : "Waiting for sync"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Property {truncateAddress(selectedProperty.onChainPropertyAddress)}
                      </p>
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <MetricTile
                      label="Unit price"
                      value={formatInr(selectedProperty.unitPriceInrMinor)}
                      hint={`Minimum ${formatInr(selectedProperty.minimumInvestmentInrMinor)} on primary.`}
                    />
                    <MetricTile
                      label="Available"
                      value={formatUnits(selectedProperty.availableUnits)}
                      hint={`${formatUnits(selectedProperty.activeListingUnits)} units already listed secondarily.`}
                    />
                    <MetricTile
                      label="Target yield"
                      value={formatPercent(selectedProperty.targetYieldBps)}
                      hint={`${formatPercent(selectedProperty.targetIrrBps)} target IRR.`}
                    />
                    <MetricTile
                      label="Exit horizon"
                      value={`${selectedProperty.expectedExitMonths}m`}
                      hint={`${selectedProperty.structureType} · ${selectedProperty.registrationRef}`}
                    />
                  </div>
                </>
              ) : (
                <>
                  <CardTitle className="text-2xl">Select an asset</CardTitle>
                  <CardDescription className="mt-2 text-sm leading-6">
                    Choose a live asset from the market list to inspect its order book and trading controls.
                  </CardDescription>
                </>
              )}
            </CardHeader>

            <CardContent className="space-y-6">
              {selectedProperty ? (
                <>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-[1.5rem] border border-border/80 bg-muted/35 p-4">
                      <div className="flex items-center gap-2">
                        <ShoppingCart className="h-4 w-4 text-primary" />
                        <p className="font-semibold text-foreground">Primary buy</p>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        Reserve units from the live offering. Payment capture moves the order into the worker settlement queue.
                      </p>
                      {userCanTrade ? (
                        <form onSubmit={handlePrimaryOrder} className="mt-4 space-y-3">
                          <div className="space-y-2">
                            <Label htmlFor="primary-units">Units</Label>
                            <Input
                              id="primary-units"
                              value={investUnits}
                              onChange={(event) => setInvestUnits(event.target.value)}
                              inputMode="numeric"
                            />
                          </div>
                          <div className="rounded-[1.1rem] border border-border bg-card/80 px-3 py-3 text-sm text-muted-foreground">
                            Gross amount{" "}
                            <span className="font-semibold text-foreground">
                              {formatInr(
                                (toPositiveInteger(investUnits) ?? 0) *
                                  selectedProperty.unitPriceInrMinor,
                              )}
                            </span>
                          </div>
                          <Button
                            type="submit"
                            className="w-full"
                            disabled={actionPending !== null}
                          >
                            {actionPending === "primary-order"
                              ? "Creating order..."
                              : "Create primary order"}
                          </Button>
                        </form>
                      ) : (
                        <EmptyPanel
                          title={user ? "Trading locked" : "Sign in required"}
                          body={
                            user
                              ? "Investor accounts need approved KYC before they can subscribe to live offerings."
                              : "Sign in as an investor to create a primary order."
                          }
                        />
                      )}
                    </div>

                    <div className="rounded-[1.5rem] border border-border/80 bg-muted/35 p-4">
                      <div className="flex items-center gap-2">
                        <CircleDollarSign className="h-4 w-4 text-primary" />
                        <p className="font-semibold text-foreground">Create sell listing</p>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        Offer owned units on the secondary board. Listings are synced to the Anchor program before buyers can fill them.
                      </p>
                      {userCanTrade ? (
                        <form onSubmit={handleListing} className="mt-4 space-y-3">
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="space-y-2">
                              <Label htmlFor="sell-units">Units to list</Label>
                              <Input
                                id="sell-units"
                                value={sellUnits}
                                onChange={(event) => setSellUnits(event.target.value)}
                                inputMode="numeric"
                                placeholder={availableToList ? String(availableToList) : "0"}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="sell-price">Price per unit</Label>
                              <Input
                                id="sell-price"
                                value={sellPrice}
                                onChange={(event) => setSellPrice(event.target.value)}
                                inputMode="numeric"
                              />
                            </div>
                          </div>
                          <div className="rounded-[1.1rem] border border-border bg-card/80 px-3 py-3 text-sm text-muted-foreground">
                            {selectedHolding ? (
                              <>
                                Available to list{" "}
                                <span className="font-semibold text-foreground">
                                  {formatUnits(availableToList)}
                                </span>{" "}
                                out of{" "}
                                <span className="font-semibold text-foreground">
                                  {formatUnits(selectedHolding.units)}
                                </span>{" "}
                                owned units.
                              </>
                            ) : (
                              "No holdings detected for this asset yet."
                            )}
                          </div>
                          <Button
                            type="submit"
                            variant="outline"
                            className="w-full"
                            disabled={actionPending !== null || !selectedHolding}
                          >
                            {actionPending === "create-listing"
                              ? "Publishing listing..."
                              : "Publish secondary listing"}
                          </Button>
                        </form>
                      ) : (
                        <EmptyPanel
                          title={user ? "Selling locked" : "Sign in required"}
                          body={
                            user
                              ? "Approved investor KYC and existing holdings are both required before you can list units."
                              : "Sign in as an investor to publish sell-side liquidity."
                          }
                        />
                      )}
                    </div>
                  </div>

                  <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
                    <div className="rounded-[1.5rem] border border-border/80 bg-muted/35 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold text-foreground">Secondary order book</p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            Active listings available to fill immediately after payment.
                          </p>
                        </div>
                        <Badge variant="muted">
                          {formatUnits(selectedAsset?.listings.length ?? 0)} listings
                        </Badge>
                      </div>
                      <div className="mt-4 space-y-3">
                        {selectedAsset?.listings.length ? (
                          selectedAsset.listings.map((listing) => {
                            const buyValue = listingOrderSizes[listing.id] ?? "1";
                            const listingDisabled =
                              actionPending !== null ||
                              !userCanTrade ||
                              listing.sellerId === user?.id;

                            return (
                              <div
                                key={listing.id}
                                className="rounded-[1.2rem] border border-border bg-card/80 p-4"
                              >
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                  <div>
                                    <p className="font-medium text-foreground">
                                      {listing.sellerName ?? "Unknown seller"}
                                    </p>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                      {formatUnits(listing.unitsRemaining)} units remaining at{" "}
                                      {formatInr(listing.pricePerUnitInrMinor)} each
                                    </p>
                                  </div>
                                  <div className="flex flex-col items-end gap-2">
                                    <Badge className={statusTone(listing.status)}>
                                      {formatRole(listing.status)}
                                    </Badge>
                                    <Badge variant="muted">
                                      {listing.onChainAddress ? "On-chain" : "Syncing"}
                                    </Badge>
                                  </div>
                                </div>
                                <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto]">
                                  <Input
                                    value={buyValue}
                                    onChange={(event) =>
                                      setListingOrderSizes((current) => ({
                                        ...current,
                                        [listing.id]: event.target.value,
                                      }))
                                    }
                                    inputMode="numeric"
                                  />
                                  <Button
                                    type="button"
                                    onClick={() => void handleListingBuy(listing.id)}
                                    disabled={listingDisabled}
                                  >
                                    {listing.sellerId === user?.id
                                      ? "Your listing"
                                      : actionPending === `buy-listing:${listing.id}`
                                        ? "Creating..."
                                        : "Buy listing"}
                                  </Button>
                                </div>
                                <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                                  <span>Listing {truncateAddress(listing.onChainAddress)}</span>
                                  <span>Signature {truncateAddress(listing.creationSignature)}</span>
                                  <span>Published {formatDateTime(listing.createdAt)}</span>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <EmptyPanel
                            title="No active secondary listings"
                            body="The market currently has no live seller offers for this asset."
                          />
                        )}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="rounded-[1.5rem] border border-border/80 bg-muted/35 p-4">
                        <div className="flex items-center gap-2">
                          <Blocks className="h-4 w-4 text-primary" />
                          <p className="font-semibold text-foreground">Recent trades</p>
                        </div>
                        <div className="mt-4 space-y-3">
                          {selectedAsset?.trades.length ? (
                            selectedAsset.trades.map((trade) => (
                              <div
                                key={trade.id}
                                className="rounded-[1.2rem] border border-border bg-card/80 p-4"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <p className="font-medium text-foreground">
                                      {formatUnits(trade.units)} units settled
                                    </p>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                      {trade.buyerName ?? "Buyer"} bought from{" "}
                                      {trade.sellerName ?? "Seller"}
                                    </p>
                                  </div>
                                  <Badge className={statusTone(trade.status)}>
                                    {formatRole(trade.status)}
                                  </Badge>
                                </div>
                                <div className="mt-3 grid gap-2 text-sm text-muted-foreground">
                                  <div className="flex items-center justify-between gap-3">
                                    <span>Total</span>
                                    <span className="font-semibold text-foreground">
                                      {formatInr(trade.totalAmountInrMinor)}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between gap-3">
                                    <span>Trade record</span>
                                    <span className="font-medium text-foreground">
                                      {truncateAddress(trade.onChainAddress)}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between gap-3">
                                    <span>Settlement signature</span>
                                    <span className="font-medium text-foreground">
                                      {truncateAddress(trade.settlementSignature)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ))
                          ) : (
                            <EmptyPanel
                              title="No completed trades"
                              body="Secondary fills will appear here after buyers complete payment and the worker settles them."
                            />
                          )}
                        </div>
                      </div>

                      <div className="rounded-[1.5rem] border border-border/80 bg-muted/35 p-4">
                        <div className="flex items-center gap-2">
                          <Landmark className="h-4 w-4 text-primary" />
                          <p className="font-semibold text-foreground">Documents and chain metadata</p>
                        </div>
                        <div className="mt-4 grid gap-3 text-sm text-muted-foreground">
                          <div className="flex items-center justify-between gap-3">
                            <span>Property account</span>
                            <span className="font-medium text-foreground">
                              {truncateAddress(selectedProperty.onChainPropertyAddress)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <span>Offering account</span>
                            <span className="font-medium text-foreground">
                              {truncateAddress(selectedProperty.onChainOfferingAddress)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <span>Last sync</span>
                            <span className="font-medium text-foreground">
                              {formatDateTime(selectedProperty.lastChainSyncAt)}
                            </span>
                          </div>
                        </div>
                        <Separator className="my-4" />
                        <div className="space-y-3">
                          {selectedAsset?.documents.length ? (
                            selectedAsset.documents.map((document) => (
                              <a
                                key={document.id}
                                href={`${API_BASE_URL}/property-documents/files/${document.id}`}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center justify-between gap-3 rounded-[1.1rem] border border-border bg-card/80 px-3 py-3 text-sm text-foreground transition-colors hover:border-primary/20"
                              >
                                <div>
                                  <p className="font-medium">{document.name}</p>
                                  <p className="mt-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                                    {document.category}
                                  </p>
                                </div>
                                <ExternalLink className="h-4 w-4 text-muted-foreground" />
                              </a>
                            ))
                          ) : (
                            <EmptyPanel
                              title="No approved documents"
                              body="Approved diligence files will appear here once they exist in local state."
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <EmptyPanel
                  title="No asset selected"
                  body="Choose a property from the left-hand market list to load detailed trading controls."
                />
              )}
            </CardContent>
          </Card>
        </section>

        {user ? (
          <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-6">
              <Card className="border-border bg-card/92 shadow-2xl backdrop-blur">
                <CardHeader>
                  <CardTitle className="text-2xl">Portfolio and listings</CardTitle>
                  <CardDescription className="mt-2 text-sm leading-6">
                    Holdings, active sell inventory, and announced distributions in the investor account.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {portfolio?.holdings.length ? (
                    portfolio.holdings.map((holding: Holding) => (
                      <div
                        key={holding.id}
                        className="rounded-[1.5rem] border border-border/80 bg-muted/35 p-4"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-lg font-semibold text-foreground">
                              {holding.property.name}
                            </p>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {holding.property.symbol} · {holding.property.city}
                            </p>
                          </div>
                          <Badge className={statusTone("settled")}>
                            {formatUnits(holding.units)} units
                          </Badge>
                        </div>
                        <div className="mt-4 grid gap-3 sm:grid-cols-3">
                          <div className="rounded-[1.1rem] border border-border bg-card/80 p-3">
                            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                              Average price
                            </p>
                            <p className="mt-2 font-semibold text-foreground">
                              {formatInr(holding.averagePriceInrMinor)}
                            </p>
                          </div>
                          <div className="rounded-[1.1rem] border border-border bg-card/80 p-3">
                            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                              Market value
                            </p>
                            <p className="mt-2 font-semibold text-foreground">
                              {formatInr(holding.marketValueInrMinor)}
                            </p>
                          </div>
                          <div className="rounded-[1.1rem] border border-border bg-card/80 p-3">
                            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                              Listed units
                            </p>
                            <p className="mt-2 font-semibold text-foreground">
                              {formatUnits(holding.listedUnits)}
                            </p>
                          </div>
                        </div>
                        <div className="mt-4 text-sm text-muted-foreground">
                          Holding account {truncateAddress(holding.onChainAddress)}
                        </div>
                      </div>
                    ))
                  ) : (
                    <EmptyPanel
                      title="No portfolio holdings yet"
                      body="Settle a primary or secondary order to make token positions appear here."
                    />
                  )}

                  <Separator className="my-2" />

                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="space-y-3">
                      <p className="font-semibold text-foreground">Your secondary listings</p>
                      {portfolio?.listings.length ? (
                        portfolio.listings.map((listing) => (
                          <div
                            key={listing.id}
                            className="rounded-[1.2rem] border border-border bg-card/80 p-3"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className="font-medium text-foreground">
                                  {listing.property?.name ?? "Unknown asset"}
                                </p>
                                <p className="mt-1 text-sm text-muted-foreground">
                                  {formatUnits(listing.unitsRemaining)} /{" "}
                                  {formatUnits(listing.unitsListed)} units remaining
                                </p>
                              </div>
                              <Badge className={statusTone(listing.status)}>
                                {formatRole(listing.status)}
                              </Badge>
                            </div>
                          </div>
                        ))
                      ) : (
                        <EmptyPanel
                          title="No personal listings"
                          body="Publish sell-side liquidity from the selected asset panel to populate this section."
                        />
                      )}
                    </div>

                    <div className="space-y-3">
                      <p className="font-semibold text-foreground">Distributions</p>
                      {portfolio?.distributions.length ? (
                        portfolio.distributions.map((distribution) => (
                          <div
                            key={distribution.id}
                            className="rounded-[1.2rem] border border-border bg-card/80 p-3"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className="font-medium text-foreground">
                                  {distribution.property.name}
                                </p>
                                <p className="mt-1 text-sm text-muted-foreground">
                                  Payable {formatDate(distribution.payableAt)}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold text-foreground">
                                  {formatInr(distribution.amountInrMinor)}
                                </p>
                                <p className="mt-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                                  {formatRole(distribution.status)}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <EmptyPanel
                          title="No announced distributions"
                          body="Cash distributions created by the platform will be listed here."
                        />
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border bg-card/92 shadow-2xl backdrop-blur">
                <CardHeader>
                  <CardTitle className="text-2xl">Orders and payments</CardTitle>
                  <CardDescription className="mt-2 text-sm leading-6">
                    Payments drive settlement. Pending payment capture triggers the worker and updates the on-chain state.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
                  <div className="space-y-3">
                    <p className="font-semibold text-foreground">Recent orders</p>
                    {orders.length ? (
                      orders.map((order) => (
                        <div
                          key={order.id}
                          className="rounded-[1.2rem] border border-border bg-card/80 p-4"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="font-medium text-foreground">
                                {order.property.name}
                              </p>
                              <p className="mt-1 text-sm text-muted-foreground">
                                {formatRole(order.kind)} · {formatUnits(order.units)} units
                              </p>
                            </div>
                            <Badge className={statusTone(order.status)}>
                              {formatRole(order.status)}
                            </Badge>
                          </div>
                          <div className="mt-3 grid gap-2 text-sm text-muted-foreground">
                            <div className="flex items-center justify-between gap-3">
                              <span>Gross amount</span>
                              <span className="font-semibold text-foreground">
                                {formatInr(order.grossAmountInrMinor)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                              <span>Fee</span>
                              <span className="font-semibold text-foreground">
                                {formatInr(order.feeAmountInrMinor)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                              <span>Settlement signature</span>
                              <span className="font-medium text-foreground">
                                {truncateAddress(order.settlementSignature)}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <EmptyPanel
                        title="No orders yet"
                        body="Create a primary order or buy a live listing to start building an execution trail."
                      />
                    )}
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold text-foreground">Pending and settled payments</p>
                      <Badge variant="muted">
                        {payments ? formatInr(payments.cashBalanceInrMinor) : "Loading"}
                      </Badge>
                    </div>
                    {payments?.payments.length ? (
                      payments.payments.map((payment) => (
                        <div
                          key={payment.id}
                          className="rounded-[1.2rem] border border-border bg-card/80 p-4"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="font-medium text-foreground">
                                {payment.property.name}
                              </p>
                              <p className="mt-1 text-sm text-muted-foreground">
                                {payment.reference}
                              </p>
                            </div>
                            <Badge className={statusTone(payment.status)}>
                              {formatRole(payment.status)}
                            </Badge>
                          </div>
                          <div className="mt-3 flex items-center justify-between gap-3 text-sm text-muted-foreground">
                            <span>Amount</span>
                            <span className="font-semibold text-foreground">
                              {formatInr(payment.amountInrMinor)}
                            </span>
                          </div>
                          <div className="mt-4">
                            <Button
                              type="button"
                              variant="outline"
                              className="w-full"
                              onClick={() => void handlePayment(payment.id)}
                              disabled={
                                actionPending !== null || payment.status !== "pending"
                              }
                            >
                              {actionPending === `pay:${payment.id}`
                                ? "Capturing payment..."
                                : payment.status === "pending"
                                  ? "Capture mock UPI payment"
                                  : "Payment captured"}
                            </Button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <EmptyPanel
                        title="No payments recorded"
                        body="Orders generate payment intents automatically. They will show up here once created."
                      />
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card className="border-border bg-card/92 shadow-2xl backdrop-blur">
                <CardHeader>
                  <CardTitle className="text-2xl">KYC and wallet controls</CardTitle>
                  <CardDescription className="mt-2 text-sm leading-6">
                    Trading is gated by KYC, while wallet binding updates the investor registry with an external Solana address.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="rounded-[1.5rem] border border-border/80 bg-muted/35 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 text-primary" />
                        <p className="font-semibold text-foreground">KYC status</p>
                      </div>
                      <Badge className={statusTone(user.kycStatus)}>
                        {formatRole(user.kycStatus)}
                      </Badge>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {user.kycStatus === "approved"
                        ? "KYC is approved. Trading is unlocked for this investor account."
                        : "Submit or update KYC data here, then approve it through the admin workspace to unlock trading."}
                    </p>
                    <form onSubmit={handleKycSubmit} className="mt-4 space-y-3">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="pan-masked">PAN</Label>
                          <Input
                            id="pan-masked"
                            value={kycForm.panMasked}
                            onChange={(event) =>
                              setKycForm((current) => ({
                                ...current,
                                panMasked: event.target.value,
                              }))
                            }
                            placeholder="ABCDE1234F"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="aadhaar-masked">Aadhaar</Label>
                          <Input
                            id="aadhaar-masked"
                            value={kycForm.aadhaarMasked}
                            onChange={(event) =>
                              setKycForm((current) => ({
                                ...current,
                                aadhaarMasked: event.target.value,
                              }))
                            }
                            placeholder="0001"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="occupation">Occupation</Label>
                        <Input
                          id="occupation"
                          value={kycForm.occupation}
                          onChange={(event) =>
                            setKycForm((current) => ({
                              ...current,
                              occupation: event.target.value,
                            }))
                          }
                          placeholder="Founder"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="income-band">Annual income band</Label>
                        <Input
                          id="income-band"
                          value={kycForm.annualIncomeBand}
                          onChange={(event) =>
                            setKycForm((current) => ({
                              ...current,
                              annualIncomeBand: event.target.value,
                            }))
                          }
                          placeholder="Above 50L"
                        />
                      </div>
                      <Button
                        type="submit"
                        variant="outline"
                        className="w-full"
                        disabled={actionPending !== null}
                      >
                        {actionPending === "submit-kyc" ? "Submitting KYC..." : "Submit KYC"}
                      </Button>
                    </form>
                    {kycRecord?.submittedAt ? (
                      <p className="mt-3 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                        Last submitted {formatDateTime(kycRecord.submittedAt)}
                      </p>
                    ) : null}
                  </div>

                  <div className="rounded-[1.5rem] border border-border/80 bg-muted/35 p-4">
                    <div className="flex items-center gap-2">
                      <WalletCards className="h-4 w-4 text-primary" />
                      <p className="font-semibold text-foreground">Bind external wallet</p>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      Managed wallets remain the execution default. Binding an external address updates the investor registry reference.
                    </p>
                    <form onSubmit={handleWalletBind} className="mt-4 space-y-3">
                      <div className="space-y-2">
                        <Label htmlFor="wallet-address">Solana wallet address</Label>
                        <Input
                          id="wallet-address"
                          value={walletAddress}
                          onChange={(event) => setWalletAddress(event.target.value)}
                          placeholder="Enter a base58 Solana address"
                        />
                      </div>
                      <Button
                        type="submit"
                        className="w-full"
                        disabled={actionPending !== null}
                      >
                        {actionPending === "bind-wallet" ? "Binding wallet..." : "Bind wallet"}
                      </Button>
                    </form>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border bg-card/92 shadow-2xl backdrop-blur">
                <CardHeader>
                  <CardTitle className="text-2xl">Next actions</CardTitle>
                  <CardDescription className="mt-2 text-sm leading-6">
                    Current account guidance and recent notifications from the local product stack.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {investorNeedsKyc ? (
                    <div className="rounded-[1.5rem] border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-700">
                      Trading remains locked until this investor account reaches approved KYC status.
                    </div>
                  ) : null}

                  {dashboard?.nextSteps.length ? (
                    <div className="space-y-3">
                      {dashboard.nextSteps.map((step) => (
                        <div
                          key={step}
                          className="rounded-[1.2rem] border border-border bg-card/80 p-4 text-sm leading-6 text-muted-foreground"
                        >
                          {step}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyPanel
                      title="Loading guidance"
                      body="Next-step prompts will appear once the dashboard summary is available."
                    />
                  )}

                  <Separator className="my-2" />

                  <div className="space-y-3">
                    <p className="font-semibold text-foreground">Recent notifications</p>
                    {dashboard?.notifications.length ? (
                      dashboard.notifications.map((notification) => (
                        <div
                          key={notification.id}
                          className="rounded-[1.2rem] border border-border bg-card/80 p-4"
                        >
                          <p className="font-medium text-foreground">{notification.title}</p>
                          <p className="mt-2 text-sm leading-6 text-muted-foreground">
                            {notification.body}
                          </p>
                          <p className="mt-3 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                            {formatDateTime(notification.createdAt)}
                          </p>
                        </div>
                      ))
                    ) : (
                      <EmptyPanel
                        title="No notifications yet"
                        body="Exchange-side updates will appear here when the API emits them."
                      />
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>
        ) : null}

        <section className="grid gap-6 lg:grid-cols-[1fr_auto]">
          <Card className="border-border bg-card/92 shadow-2xl backdrop-blur">
            <CardContent className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                  Local stack note
                </p>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                  This app assumes `apps/api` and `apps/worker` are running. If you also start the
                  Solana validator, listings and settlements surface chain addresses and signatures
                  from the Anchor program automatically.
                </p>
              </div>
              <div className="flex items-center gap-3 text-sm font-medium text-foreground">
                <Coins className="h-4 w-4 text-primary" />
                Program {truncateAddress(PROGRAM_ID, 6)}
              </div>
            </CardContent>
          </Card>
          <Button
            type="button"
            variant="outline"
            onClick={() => void refreshAll()}
            disabled={actionPending !== null || sessionLoading}
            className="h-auto rounded-[1.25rem] border-border bg-card/92 px-5 py-4 shadow-lg"
          >
            <span className="inline-flex items-center gap-2">
              <RefreshCcw className="h-4 w-4" />
              Refresh exchange
            </span>
          </Button>
        </section>
      </div>
    </div>
  );
}

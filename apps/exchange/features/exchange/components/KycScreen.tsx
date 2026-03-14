"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { WalletReadyState } from "@solana/wallet-adapter-base";
import { useWallet } from "@solana/wallet-adapter-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/product-api";
import { AuthGate } from "@/features/exchange/components/AuthGate";
import { EmptyState, Notice, ScreenHeader } from "@/features/exchange/components/ExchangePrimitives";
import { StatusBadge } from "@/features/exchange/components/StatusBadge";
import { useSession } from "@/features/exchange/context/SessionContext";
import { formatDate, truncateAddress } from "@/features/exchange/lib/format";
import {
  getStoredBoundWallet,
  setStoredBoundWallet,
  type StoredBoundWallet,
} from "@/lib/wallet-storage";
import type { KycRecord } from "@/features/exchange/types";

export function KycScreen() {
  const { bindWallet, refreshSession, token, user } = useSession();
  const { wallets } = useWallet();
  const [record, setRecord] = useState<KycRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<"kyc" | "wallet" | null>(null);
  const [formData, setFormData] = useState({
    panMasked: "",
    aadhaarMasked: "",
    occupation: "",
    annualIncomeBand: "",
  });
  const [walletAddress, setWalletAddress] = useState("");
  const [storedWallet, setStoredWallet] = useState<StoredBoundWallet | null>(null);
  const [showWalletSetup, setShowWalletSetup] = useState(false);
  const detectedWallets = wallets.filter(
    ({ readyState }) =>
      readyState === WalletReadyState.Installed || readyState === WalletReadyState.Loadable,
  );
  const boundWalletAddress = user?.externalWalletAddress ?? "";
  const hasBoundWallet = Boolean(boundWalletAddress);
  const walletConnectionLabel =
    storedWallet?.walletName ?? (hasBoundWallet ? "Connected wallet" : null);
  const isKycApproved = user?.kycStatus === "approved" || record?.status === "approved";
  const isKycPending = record?.status === "pending";
  const isKycLocked = isKycPending || isKycApproved;

  const load = useCallback(async () => {
    if (!token) {
      setRecord(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await apiFetch<{ record: KycRecord | null }>("/kyc", { token });
      setRecord(response.record);
      if (response.record) {
        setFormData({
          panMasked: response.record.panMasked,
          aadhaarMasked: response.record.aadhaarMasked,
          occupation: response.record.occupation,
          annualIncomeBand: response.record.annualIncomeBand,
        });
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load KYC status.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setWalletAddress(user?.externalWalletAddress ?? "");
  }, [user?.externalWalletAddress]);

  useEffect(() => {
    const nextStoredWallet = getStoredBoundWallet();

    if (
      nextStoredWallet &&
      nextStoredWallet.userId === user?.id &&
      nextStoredWallet.address === (user?.externalWalletAddress ?? "")
    ) {
      setStoredWallet(nextStoredWallet);
      return;
    }

    if (user?.id && user.externalWalletAddress) {
      const fallbackWallet = {
        userId: user.id,
        walletName: null,
        address: user.externalWalletAddress,
        boundAt: new Date().toISOString(),
      } satisfies StoredBoundWallet;
      setStoredWallet(fallbackWallet);
      setStoredBoundWallet(fallbackWallet);
      return;
    }

    setStoredWallet(null);
  }, [user?.externalWalletAddress, user?.id]);

  useEffect(() => {
    setShowWalletSetup(!hasBoundWallet);
  }, [hasBoundWallet]);

  async function handleSubmitKyc(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!token) {
      return;
    }

    if (isKycLocked) {
      setError(
        isKycApproved
          ? "KYC is already approved for this account."
          : "KYC is already under review and cannot be edited right now.",
      );
      setMessage(null);
      return;
    }

    if (
      !formData.panMasked.trim() ||
      !formData.aadhaarMasked.trim() ||
      !formData.occupation.trim() ||
      !formData.annualIncomeBand.trim()
    ) {
      setError("Complete all KYC fields before submitting.");
      setMessage(null);
      return;
    }

    setPendingAction("kyc");
    setError(null);
    setMessage(null);

    try {
      const response = await apiFetch<{ record: KycRecord }>("/kyc/submit", {
        method: "POST",
        token,
        body: formData,
      });

      setRecord(response.record);
      setMessage("KYC submitted for review.");
      await refreshSession();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to submit KYC.");
    } finally {
      setPendingAction(null);
    }
  }

  async function handleBindWallet(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!walletAddress.trim()) {
      setError("Enter the Solana wallet address you want to bind.");
      setMessage(null);
      return;
    }

    setPendingAction("wallet");
    setError(null);
    setMessage(null);

    try {
      await bindWallet(walletAddress.trim());
      if (user?.id) {
        const nextStoredWallet = {
          userId: user.id,
          walletName: storedWallet?.walletName ?? null,
          address: walletAddress.trim(),
          boundAt: new Date().toISOString(),
        } satisfies StoredBoundWallet;
        setStoredWallet(nextStoredWallet);
        setStoredBoundWallet(nextStoredWallet);
      }
      setShowWalletSetup(false);
      setMessage("External wallet bound to the investor profile.");
      await refreshSession();
    } catch (bindError) {
      setError(bindError instanceof Error ? bindError.message : "Failed to bind wallet.");
    } finally {
      setPendingAction(null);
    }
  }

  async function handleConnectAndBindWallet(walletName: string) {
    const walletEntry = detectedWallets.find((value) => String(value.adapter.name) === walletName);

    if (!walletEntry) {
      setError("Selected wallet is no longer available.");
      setMessage(null);
      return;
    }

    setPendingAction("wallet");
    setError(null);
    setMessage(`Connecting ${walletName}...`);

    try {
      await walletEntry.adapter.connect();
      const nextAddress = walletEntry.adapter.publicKey?.toBase58();

      if (!nextAddress) {
        throw new Error(`${walletName} connected without exposing a Solana public key.`);
      }

      setWalletAddress(nextAddress);
      setMessage(`Binding ${walletName} to your investor profile...`);
      await bindWallet(nextAddress);
      if (user?.id) {
        const nextStoredWallet = {
          userId: user.id,
          walletName,
          address: nextAddress,
          boundAt: new Date().toISOString(),
        } satisfies StoredBoundWallet;
        setStoredWallet(nextStoredWallet);
        setStoredBoundWallet(nextStoredWallet);
      }
      setShowWalletSetup(false);
      setMessage(`${walletName} connected and bound to the investor profile.`);
      await refreshSession();
    } catch (walletError) {
      setMessage(null);
      setError(
        walletError instanceof Error
          ? walletError.message
          : `Failed to connect and bind ${walletName}.`,
      );
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <AuthGate allowedRoles={["investor"]}>
      <div className="space-y-6">
        <ScreenHeader
          eyebrow="Investor KYC"
          title="Compliance onboarding and wallet binding"
          description="Keep trade readiness on its own page so KYC submission and wallet updates are separate from the order flow."
        />

        {error ? <Notice tone="error">{error}</Notice> : null}
        {message ? <Notice tone="success">{message}</Notice> : null}

        {loading ? (
          <Card className="border-white/70 bg-card/92 shadow-2xl shadow-sky-950/10 backdrop-blur">
            <CardContent className="px-6 py-10 text-sm text-muted-foreground">
              Loading compliance record...
            </CardContent>
          </Card>
        ) : isKycApproved ? (
          <Card className="border-white/70 bg-card/92 shadow-2xl shadow-sky-950/10 backdrop-blur">
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle className="text-2xl">KYC approved</CardTitle>
                <p className="mt-2 text-sm text-muted-foreground">
                  This investor account has already cleared compliance review, so the KYC form is no longer editable.
                </p>
              </div>
              <StatusBadge value="approved" />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-[1.3rem] border border-emerald-500/20 bg-emerald-500/10 p-4">
                <p className="font-medium text-foreground">Approval confirmed</p>
                <p className="mt-1 text-sm text-emerald-700">
                  {record?.reviewedAt
                    ? `Reviewed on ${formatDate(record.reviewedAt)}.`
                    : "This account is approved and ready for trading."}
                </p>
              </div>
              <div className="rounded-[1.3rem] border border-white/70 bg-white/80 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Current status
                </p>
                <div className="mt-3 flex items-center gap-3">
                  <StatusBadge value="approved" />
                  <span className="text-sm text-muted-foreground">
                    The KYC route is hidden from the main navigation for approved investors.
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
            <Card className="border-white/70 bg-card/92 shadow-2xl shadow-sky-950/10 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-2xl">KYC status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between gap-3 rounded-[1.3rem] border border-white/70 bg-white/80 p-4">
                  <div>
                    <p className="font-medium text-foreground">Current review state</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Submit investor details here, then approve the record from the admin workspace.
                    </p>
                  </div>
                  <StatusBadge value={record?.status ?? "not_started"} />
                </div>

                {record?.status === "approved" ? (
                  <Notice tone="success">Approved on {formatDate(record.reviewedAt)}.</Notice>
                ) : record?.status === "pending" ? (
                  <Notice tone="warning">
                    Submitted on {formatDate(record.submittedAt)} and awaiting review. Details are now locked until an admin decision is made.
                  </Notice>
                ) : null}

                <form onSubmit={handleSubmitKyc} className="space-y-3">
                  <Input
                    value={formData.panMasked}
                    onChange={(event) =>
                      setFormData((current) => ({ ...current, panMasked: event.target.value }))
                    }
                    placeholder="PAN"
                    disabled={pendingAction !== null || isKycLocked}
                  />
                  <Input
                    value={formData.aadhaarMasked}
                    onChange={(event) =>
                      setFormData((current) => ({ ...current, aadhaarMasked: event.target.value }))
                    }
                    placeholder="Aadhaar last 4 digits"
                    disabled={pendingAction !== null || isKycLocked}
                  />
                  <Input
                    value={formData.occupation}
                    onChange={(event) =>
                      setFormData((current) => ({ ...current, occupation: event.target.value }))
                    }
                    placeholder="Occupation"
                    disabled={pendingAction !== null || isKycLocked}
                  />
                  <Input
                    value={formData.annualIncomeBand}
                    onChange={(event) =>
                      setFormData((current) => ({
                        ...current,
                        annualIncomeBand: event.target.value,
                      }))
                    }
                    placeholder="Annual income band"
                    disabled={pendingAction !== null || isKycLocked}
                  />
                  <Button type="submit" disabled={pendingAction !== null || isKycLocked}>
                    {pendingAction === "kyc"
                      ? "Submitting..."
                      : isKycPending
                        ? "Under review"
                        : isKycApproved
                          ? "KYC approved"
                          : "Submit KYC"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card className="border-white/70 bg-card/92 shadow-2xl shadow-sky-950/10 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-2xl">Wallet binding</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-[1.3rem] border border-white/70 bg-white/80 p-4">
                  <p className="font-medium text-foreground">Managed wallet</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {user?.managedWalletAddress ?? "Unavailable"}
                  </p>
                </div>

                {hasBoundWallet && !showWalletSetup ? (
                  <div className="rounded-[1.3rem] border border-emerald-500/20 bg-emerald-500/10 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="font-medium text-foreground">
                          {walletConnectionLabel ?? "Wallet"} successfully connected
                        </p>
                        <p className="mt-1 text-sm text-emerald-700">
                          This investor profile already has a bound external Solana wallet.
                        </p>
                      </div>
                      <StatusBadge value="approved" />
                    </div>
                    <div className="mt-4 rounded-[1.1rem] border border-white/70 bg-white/80 p-3 text-sm">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        Bound address
                      </p>
                      <p className="mt-2 break-all font-medium text-foreground">
                        {boundWalletAddress}
                      </p>
                      <p className="mt-2 text-muted-foreground">
                        Short form {truncateAddress(boundWalletAddress, 6)}
                      </p>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <Button type="button" variant="outline" onClick={() => setShowWalletSetup(true)}>
                        Change wallet
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="rounded-[1.3rem] border border-white/70 bg-white/80 p-4">
                      <p className="font-medium text-foreground">Detected Solana wallets</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Connect and bind in one step. For Phantom, make sure the extension is unlocked and has a Solana account available.
                      </p>

                      <div className="mt-4 space-y-3">
                        {detectedWallets.length ? (
                          detectedWallets.map((walletEntry) => {
                            const walletName = String(walletEntry.adapter.name);

                            return (
                              <div
                                key={walletName}
                                className="flex flex-col gap-3 rounded-[1.1rem] border border-border/70 bg-background/70 p-3 sm:flex-row sm:items-center sm:justify-between"
                              >
                                <div className="flex items-center gap-3">
                                  <img
                                    src={walletEntry.adapter.icon}
                                    alt={`${walletName} icon`}
                                    className="h-8 w-8 rounded-md"
                                  />
                                  <div>
                                    <p className="font-medium text-foreground">{walletName}</p>
                                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                                      {walletEntry.readyState === WalletReadyState.Installed
                                        ? "Detected"
                                        : "Loadable"}
                                    </p>
                                  </div>
                                </div>
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => void handleConnectAndBindWallet(walletName)}
                                  disabled={pendingAction !== null}
                                >
                                  {pendingAction === "wallet" ? "Connecting..." : `Connect ${walletName}`}
                                </Button>
                              </div>
                            );
                          })
                        ) : (
                          <EmptyState
                            title="No compatible Solana wallets detected"
                            description="Install Phantom, Backpack, Solflare, or another Wallet Standard compatible Solana wallet and refresh this page."
                          />
                        )}
                      </div>
                    </div>

                    <form onSubmit={handleBindWallet} className="space-y-3">
                      <Input
                        value={walletAddress}
                        onChange={(event) => setWalletAddress(event.target.value)}
                        placeholder="External Solana wallet address"
                      />
                      <div className="flex flex-wrap gap-3">
                        <Button type="submit" variant="outline" disabled={pendingAction !== null}>
                          {pendingAction === "wallet" ? "Binding..." : "Bind manual address"}
                        </Button>
                        {hasBoundWallet ? (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setShowWalletSetup(false)}
                            disabled={pendingAction !== null}
                          >
                            Cancel
                          </Button>
                        ) : null}
                      </div>
                    </form>
                  </>
                )}

                {!record ? (
                  <EmptyState
                    title="No KYC record yet"
                    description="You can still bind a wallet, but trading remains locked until KYC is approved."
                  />
                ) : null}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AuthGate>
  );
}

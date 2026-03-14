"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/product-api";
import { AuthGate } from "@/features/exchange/components/AuthGate";
import { EmptyState, Notice, ScreenHeader } from "@/features/exchange/components/ExchangePrimitives";
import { StatusBadge } from "@/features/exchange/components/StatusBadge";
import { useSession } from "@/features/exchange/context/SessionContext";
import { formatDate } from "@/features/exchange/lib/format";
import type { KycRecord } from "@/features/exchange/types";

export function KycScreen() {
  const { bindWallet, refreshSession, token, user } = useSession();
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

  async function handleSubmitKyc(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!token) {
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
      setMessage("External wallet bound to the investor profile.");
      await refreshSession();
    } catch (bindError) {
      setError(bindError instanceof Error ? bindError.message : "Failed to bind wallet.");
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
                  <Notice tone="warning">Submitted on {formatDate(record.submittedAt)} and awaiting review.</Notice>
                ) : null}

                <form onSubmit={handleSubmitKyc} className="space-y-3">
                  <Input
                    value={formData.panMasked}
                    onChange={(event) =>
                      setFormData((current) => ({ ...current, panMasked: event.target.value }))
                    }
                    placeholder="PAN"
                  />
                  <Input
                    value={formData.aadhaarMasked}
                    onChange={(event) =>
                      setFormData((current) => ({ ...current, aadhaarMasked: event.target.value }))
                    }
                    placeholder="Aadhaar last 4 digits"
                  />
                  <Input
                    value={formData.occupation}
                    onChange={(event) =>
                      setFormData((current) => ({ ...current, occupation: event.target.value }))
                    }
                    placeholder="Occupation"
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
                  />
                  <Button type="submit" disabled={pendingAction !== null}>
                    {pendingAction === "kyc" ? "Submitting..." : "Submit KYC"}
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

                <form onSubmit={handleBindWallet} className="space-y-3">
                  <Input
                    value={walletAddress}
                    onChange={(event) => setWalletAddress(event.target.value)}
                    placeholder="External Solana wallet address"
                  />
                  <Button type="submit" variant="outline" disabled={pendingAction !== null}>
                    {pendingAction === "wallet" ? "Binding..." : "Bind wallet"}
                  </Button>
                </form>

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

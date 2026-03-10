"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/product-api";
import { AuthGate } from "@/features/product/components/AuthGate";
import { StatusBadge } from "@/features/product/components/StatusBadge";
import { useSession } from "@/features/product/context/SessionContext";
import { formatInr } from "@/features/product/lib/format";
import type { AdminOverview } from "@/features/product/types";

export function AdminConsoleScreen() {
  const { token } = useSession();
  const [state, setState] = useState<AdminOverview | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const response = await apiFetch<AdminOverview>("/admin/overview", { token });
      setState(response);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load admin overview.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const approveKyc = async (kycId: string) => {
    if (!token) {
      return;
    }

    try {
      await apiFetch<{ record: unknown }>(`/admin/kyc/${kycId}/approve`, {
        method: "POST",
        token,
      });
      toast.success("KYC approved.");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to approve KYC.");
    }
  };

  const rejectKyc = async (kycId: string) => {
    if (!token) {
      return;
    }

    try {
      await apiFetch<{ record: unknown }>(`/admin/kyc/${kycId}/reject`, {
        method: "POST",
        token,
      });
      toast.success("KYC rejected.");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to reject KYC.");
    }
  };

  const approveProperty = async (propertyId: string) => {
    if (!token) {
      return;
    }

    try {
      await apiFetch<{ property: unknown }>(`/admin/properties/${propertyId}/approve`, {
        method: "POST",
        token,
      });
      toast.success("Asset approved.");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to approve the asset.");
    }
  };

  const publishProperty = async (propertyId: string) => {
    if (!token) {
      return;
    }

    try {
      await apiFetch<{ property: unknown }>(`/admin/properties/${propertyId}/publish`, {
        method: "POST",
        token,
      });
      toast.success("Asset published.");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to publish the asset.");
    }
  };

  return (
    <AuthGate allowedRoles={["admin"]}>
      {loading || !state ? (
        <div className="rounded-[2rem] border border-border bg-card p-8 text-sm text-muted-foreground">
          Loading admin console...
        </div>
      ) : (
        <div className="space-y-6">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">Admin console</p>
              <h1 className="mt-3 text-3xl font-semibold text-foreground">Compliance, publishing, and settlement queue</h1>
            </div>

          <div className="grid gap-4 md:grid-cols-4">
            <div className="rounded-[1.75rem] border border-border bg-card p-5">
              <p className="text-sm text-muted-foreground">Pending KYC</p>
              <p className="mt-3 text-2xl font-semibold text-foreground">{state.stats.pendingKyc}</p>
            </div>
            <div className="rounded-[1.75rem] border border-border bg-card p-5">
              <p className="text-sm text-muted-foreground">Asset review</p>
              <p className="mt-3 text-2xl font-semibold text-foreground">{state.stats.reviewProperties}</p>
            </div>
            <div className="rounded-[1.75rem] border border-border bg-card p-5">
              <p className="text-sm text-muted-foreground">Settlement queue</p>
              <p className="mt-3 text-2xl font-semibold text-foreground">{state.stats.settlementQueue}</p>
            </div>
            <div className="rounded-[1.75rem] border border-border bg-card p-5">
              <p className="text-sm text-muted-foreground">Treasury</p>
              <p className="mt-3 text-2xl font-semibold text-foreground">
                {formatInr(state.stats.treasuryBalanceInrMinor)}
              </p>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <section className="rounded-[2rem] border border-border bg-card p-6">
              <h2 className="text-xl font-semibold text-foreground">KYC queue</h2>
              <div className="mt-4 space-y-4">
                {state.pendingKyc.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No KYC reviews are pending.</p>
                ) : (
                  state.pendingKyc.map((entry) => (
                    <div key={entry.id} className="rounded-2xl bg-background p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-medium text-foreground">{entry.user.fullName}</p>
                          <p className="mt-1 text-sm text-muted-foreground">{entry.user.email}</p>
                        </div>
                        <StatusBadge value={entry.status} />
                      </div>
                      <div className="mt-4 flex gap-3">
                        <button
                          onClick={() => approveKyc(entry.id)}
                          className="rounded-xl bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => rejectKyc(entry.id)}
                          className="rounded-xl border border-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-card"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="rounded-[2rem] border border-border bg-card p-6">
              <h2 className="text-xl font-semibold text-foreground">Asset review</h2>
              <div className="mt-4 space-y-4">
                {state.reviewProperties.map((property) => (
                  <div key={property.id} className="rounded-2xl bg-background p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium text-foreground">{property.name}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {property.assetClassLabel} · {property.assetType} · {property.structureName}
                        </p>
                      </div>
                      <StatusBadge value={property.status} />
                    </div>
                    <div className="mt-4 flex gap-3">
                      {property.status === "review" ? (
                        <button
                          onClick={() => approveProperty(property.id)}
                          className="rounded-xl bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
                        >
                          Approve asset
                        </button>
                      ) : null}
                      {property.status === "approved" ? (
                        <button
                          onClick={() => publishProperty(property.id)}
                          className="rounded-xl border border-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-card"
                        >
                          Publish to marketplace
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      )}
    </AuthGate>
  );
}

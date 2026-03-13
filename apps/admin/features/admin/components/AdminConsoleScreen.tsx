"use client";

import { useCallback, useEffect, useState } from "react";
import { FileText } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/product-api";
import { AuthGate } from "@/features/admin/components/AuthGate";
import { StatusBadge } from "@/features/admin/components/StatusBadge";
import { useSession } from "@/features/admin/context/SessionContext";
import { formatDate, formatInr } from "@/features/admin/lib/format";
import type { AdminOverview } from "@/features/admin/types";

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

  const rejectProperty = async (propertyId: string) => {
    if (!token) {
      return;
    }

    try {
      await apiFetch<{ property: unknown }>(`/admin/properties/${propertyId}/reject`, {
        method: "POST",
        token,
      });
      toast.success("Asset rejected.");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to reject the asset.");
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
            <h1 className="mt-3 text-3xl font-semibold text-foreground">
              Issuer submissions, compliance, and settlement queue
            </h1>
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
                {state.reviewProperties.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No issuer submissions are waiting for review.</p>
                ) : (
                  state.reviewProperties.map((property) => (
                    <div key={property.id} className="rounded-2xl bg-background p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-medium text-foreground">{property.name}</p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {property.assetClassLabel} · {property.assetType} · {property.structureName}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {property.city}, {property.state} · {property.registrationRef}
                          </p>
                        </div>
                        <StatusBadge value={property.status} />
                      </div>

                      <p className="mt-4 text-sm leading-6 text-muted-foreground">{property.summary}</p>

                      <div className="mt-4 grid gap-3 md:grid-cols-3">
                        <div className="rounded-xl border border-border bg-card px-3 py-2">
                          <p className="text-xs text-muted-foreground">Minimum investment</p>
                          <p className="mt-1 text-sm font-medium text-foreground">
                            {formatInr(property.minimumInvestmentInrMinor)}
                          </p>
                        </div>
                        <div className="rounded-xl border border-border bg-card px-3 py-2">
                          <p className="text-xs text-muted-foreground">Units</p>
                          <p className="mt-1 text-sm font-medium text-foreground">{property.totalUnits}</p>
                        </div>
                        <div className="rounded-xl border border-border bg-card px-3 py-2">
                          <p className="text-xs text-muted-foreground">Documents</p>
                          <p className="mt-1 text-sm font-medium text-foreground">{property.documents.length}</p>
                        </div>
                      </div>

                      <div className="mt-4">
                        <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                          Uploaded documents
                        </p>
                        {property.documents.length === 0 ? (
                          <div className="mt-3 rounded-xl border border-border bg-card px-3 py-3 text-sm text-muted-foreground">
                            No documents were uploaded with this submission.
                          </div>
                        ) : (
                          <div className="mt-3 grid gap-3 md:grid-cols-2">
                            {property.documents.map((document) => (
                              <a
                                key={document.id}
                                href={document.url}
                                target="_blank"
                                rel="noreferrer"
                                className="rounded-2xl border border-border bg-card p-4 transition-colors hover:border-ring/40"
                              >
                                <div className="flex items-start justify-between gap-4">
                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-medium text-foreground">{document.name}</p>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                      {document.category} · {document.source}
                                    </p>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                      Updated {formatDate(document.updatedAt)}
                                    </p>
                                  </div>
                                  <FileText className="h-4 w-4 shrink-0 text-primary" />
                                </div>
                              </a>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="mt-4 flex flex-wrap gap-3">
                        {property.status === "review" ? (
                          <>
                            <button
                              onClick={() => approveProperty(property.id)}
                              className="rounded-xl bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
                            >
                              Approve asset
                            </button>
                            <button
                              onClick={() => rejectProperty(property.id)}
                              className="rounded-xl border border-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-card"
                            >
                              Reject asset
                            </button>
                          </>
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
                  ))
                )}
              </div>
            </section>
          </div>
        </div>
      )}
    </AuthGate>
  );
}

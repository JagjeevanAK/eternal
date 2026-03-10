"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/product-api";
import { AuthGate } from "@/features/product/components/AuthGate";
import { StatusBadge } from "@/features/product/components/StatusBadge";
import { useSession } from "@/features/product/context/SessionContext";
import { formatDate } from "@/features/product/lib/format";
import type { KycRecord, PropertyDocument } from "@/features/product/types";

interface DocumentsResponse {
  kycRecord: KycRecord | null;
  propertyDocuments: PropertyDocument[];
}

export function DocumentsScreen() {
  const { token } = useSession();
  const [state, setState] = useState<DocumentsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await apiFetch<DocumentsResponse>("/documents", { token });
        setState(response);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to load documents.");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [token]);

  return (
    <AuthGate>
      {loading || !state ? (
        <div className="rounded-[2rem] border border-border bg-card p-8 text-sm text-muted-foreground">
          Loading documents...
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[0.7fr,1.3fr]">
          <section className="rounded-[2rem] border border-border bg-card p-6">
            <h1 className="text-2xl font-semibold text-foreground">Compliance documents</h1>
            {state.kycRecord ? (
              <div className="mt-5 rounded-2xl bg-background p-4">
                <div className="flex items-center justify-between gap-4">
                  <p className="text-sm font-medium text-foreground">Investor KYC</p>
                  <StatusBadge value={state.kycRecord.status} />
                </div>
                <p className="mt-3 text-sm text-muted-foreground">PAN: {state.kycRecord.panMasked || "Not submitted"}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Aadhaar last 4: {state.kycRecord.aadhaarMasked || "Not submitted"}
                </p>
                <p className="mt-3 text-xs text-muted-foreground">Submitted {formatDate(state.kycRecord.submittedAt)}</p>
              </div>
            ) : (
              <p className="mt-5 text-sm text-muted-foreground">No KYC record available yet.</p>
            )}
          </section>

          <section className="rounded-[2rem] border border-border bg-card p-6">
            <h2 className="text-2xl font-semibold text-foreground">Asset document access</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {state.propertyDocuments.map((document) => (
                <a
                  key={document.id}
                  href={document.url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-2xl border border-border bg-background p-4 transition-colors hover:border-ring/40"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-foreground">{document.name}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {document.property?.name} · {document.property?.assetClassLabel}
                      </p>
                    </div>
                    <StatusBadge value={document.status} />
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">
                    {document.category} · {document.source} · Updated {formatDate(document.updatedAt)}
                  </p>
                </a>
              ))}
            </div>
          </section>
        </div>
      )}
    </AuthGate>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/product-api";
import { AuthGate } from "@/features/exchange/components/AuthGate";
import { EmptyState, Notice, ScreenHeader } from "@/features/exchange/components/ExchangePrimitives";
import { StatusBadge } from "@/features/exchange/components/StatusBadge";
import { useSession } from "@/features/exchange/context/SessionContext";
import { formatDate } from "@/features/exchange/lib/format";
import type { DocumentsResponse } from "@/features/exchange/types";

export function DocumentsScreen() {
  const { token } = useSession();
  const [state, setState] = useState<DocumentsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) {
      setState(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await apiFetch<DocumentsResponse>("/documents", { token });
      setState(response);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load documents.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <AuthGate allowedRoles={["investor"]}>
      <div className="space-y-6">
        <ScreenHeader
          eyebrow="Documents"
          title="Compliance and asset file access"
          description="Keep investor KYC context and accessible asset files on a separate documents route."
        />

        {error ? <Notice tone="error">{error}</Notice> : null}

        {loading || !state ? (
          <Card className="border-border bg-card/92 shadow-2xl backdrop-blur">
            <CardContent className="px-6 py-10 text-sm text-muted-foreground">
              Loading compliance documents...
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 xl:grid-cols-[0.72fr_1.28fr]">
            <Card className="border-border bg-card/92 shadow-2xl backdrop-blur">
              <CardHeader>
                <CardTitle className="text-2xl">Investor KYC</CardTitle>
              </CardHeader>
              <CardContent>
                {state.kycRecord ? (
                  <div className="rounded-[1.3rem] border border-border bg-card/80 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium text-foreground">Current compliance record</p>
                      <StatusBadge value={state.kycRecord.status} />
                    </div>
                    <div className="mt-4 grid gap-2 text-sm text-muted-foreground">
                      <p>PAN: {state.kycRecord.panMasked || "Not submitted"}</p>
                      <p>Aadhaar: {state.kycRecord.aadhaarMasked || "Not submitted"}</p>
                      <p>Occupation: {state.kycRecord.occupation || "Not submitted"}</p>
                      <p>Annual income band: {state.kycRecord.annualIncomeBand || "Not submitted"}</p>
                      <p>Submitted: {formatDate(state.kycRecord.submittedAt)}</p>
                    </div>
                  </div>
                ) : (
                  <EmptyState
                    title="No KYC record yet"
                    description="Submit investor KYC from the KYC page to populate this panel."
                  />
                )}
              </CardContent>
            </Card>

            <Card className="border-border bg-card/92 shadow-2xl backdrop-blur">
              <CardHeader>
                <CardTitle className="text-2xl">Accessible asset documents</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                {state.propertyDocuments.length ? (
                  state.propertyDocuments.map((document) => (
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
                          <p className="mt-1 text-sm text-muted-foreground">
                            {document.property?.name ?? "Asset document"}
                          </p>
                        </div>
                        <StatusBadge value={document.status} />
                      </div>
                      <p className="mt-3 text-sm text-muted-foreground">
                        {document.category} · {document.source}
                      </p>
                      <p className="mt-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                        Updated {formatDate(document.updatedAt)}
                      </p>
                      <span className="mt-4 inline-flex items-center gap-2 text-sm text-primary">
                        Open document
                        <ExternalLink className="h-4 w-4" />
                      </span>
                    </a>
                  ))
                ) : (
                  <EmptyState
                    title="No documents available"
                    description="Documents become accessible for assets you hold after the platform stores approved files."
                  />
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AuthGate>
  );
}

"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, FileText, ShieldCheck, XCircle } from "lucide-react";
import { toast } from "sonner";
import { apiFetch, openProtectedFile } from "@/lib/product-api";
import { AuthGate } from "@/features/portal/components/AuthGate";
import { StatusBadge } from "@/features/portal/components/StatusBadge";
import { useSession } from "@/features/portal/context/SessionContext";
import { formatDate } from "@/features/portal/lib/format";
import { useHydrated } from "@/lib/useHydrated";
import { cn } from "@/lib/utils";
import type {
  IssuerVerificationRequestsResponse,
  VerificationRequest,
  VerificationRequestStatus,
} from "@/features/portal/types";

type RequestFilter = VerificationRequestStatus | "all";

const filters: Array<{ value: RequestFilter; label: string }> = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "all", label: "All" },
];

const formatAttachmentSize = (value: number) => {
  if (value >= 1024 * 1024) {
    return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  }

  if (value >= 1024) {
    return `${Math.round(value / 1024)} KB`;
  }

  return `${value} B`;
};

const mergeReviewNotes = (
  requests: VerificationRequest[],
  current: Record<string, string> = {},
) =>
  Object.fromEntries(
    requests.map((request) => [request.id, request.reviewerNote ?? current[request.id] ?? ""]),
  );

export function IssuerVerificationReviewScreen() {
  const hydrated = useHydrated();
  const { token } = useSession();
  const [state, setState] = useState<IssuerVerificationRequestsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<RequestFilter>("pending");
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [actingId, setActingId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await apiFetch<IssuerVerificationRequestsResponse>(
          "/issuer/verification/requests",
          { token },
        );
        setState(response);
        setReviewNotes((current) => mergeReviewNotes(response.requests, current));
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to load issuer review queue.");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [token]);

  const reviewRequest = async (requestId: string, action: "approve" | "reject") => {
    if (!token) {
      return;
    }

    setActingId(requestId);

    try {
      await apiFetch<{ request: VerificationRequest }>(
        `/issuer/verification/requests/${requestId}/${action}`,
        {
          method: "POST",
          token,
          body: {
            reviewerNote: reviewNotes[requestId] ?? "",
          },
        },
      );

      const refreshedState = await apiFetch<IssuerVerificationRequestsResponse>(
        "/issuer/verification/requests",
        { token },
      );
      setState(refreshedState);
      setReviewNotes((current) => mergeReviewNotes(refreshedState.requests, current));
      toast.success(action === "approve" ? "Verification approved." : "Verification rejected.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `Failed to ${action} verification request.`);
    } finally {
      setActingId(null);
    }
  };

  const openFile = async (fileId: string) => {
    if (!token) {
      return;
    }

    try {
      await openProtectedFile(`/verification/files/${fileId}`, token);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to open document.");
    }
  };

  const requests =
    activeFilter === "all"
      ? state?.requests ?? []
      : (state?.requests ?? []).filter((request) => request.status === activeFilter);

  if (!hydrated) {
    return (
      <div className="rounded-[2rem] border border-border bg-card p-8 text-sm text-muted-foreground">
        Loading issuer review queue...
      </div>
    );
  }

  return (
    <AuthGate allowedRoles={["issuer"]}>
      {loading || !state ? (
        <div className="rounded-[2rem] border border-border bg-card p-8 text-sm text-muted-foreground">
          Loading issuer review queue...
        </div>
      ) : (
        <div className="space-y-6">
          <section className="rounded-[2rem] border border-border bg-card p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
                    Issuer review desk
                  </p>
                  <h1 className="mt-3 text-3xl font-semibold text-foreground">Owner verification queue</h1>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {filters.map((filter) => (
                  <button
                    key={filter.value}
                    type="button"
                    onClick={() => setActiveFilter(filter.value)}
                    className={cn(
                      "rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                      activeFilter === filter.value
                        ? "border-primary/30 bg-primary/10 text-primary"
                        : "border-border bg-background text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <div className="rounded-[1.75rem] border border-border bg-background p-5">
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="mt-3 text-2xl font-semibold text-foreground">{state.stats.pending}</p>
              </div>
              <div className="rounded-[1.75rem] border border-border bg-background p-5">
                <p className="text-sm text-muted-foreground">Approved</p>
                <p className="mt-3 text-2xl font-semibold text-foreground">{state.stats.approved}</p>
              </div>
              <div className="rounded-[1.75rem] border border-border bg-background p-5">
                <p className="text-sm text-muted-foreground">Rejected</p>
                <p className="mt-3 text-2xl font-semibold text-foreground">{state.stats.rejected}</p>
              </div>
            </div>
          </section>

          <section className="rounded-[2rem] border border-border bg-card p-6">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-2xl font-semibold text-foreground">Requests</h2>
              <p className="text-sm text-muted-foreground">
                {requests.length} {requests.length === 1 ? "request" : "requests"} shown
              </p>
            </div>

            {requests.length === 0 ? (
              <div className="mt-6 rounded-2xl border border-border bg-background p-5">
                <p className="text-sm font-medium text-foreground">No requests in this filter.</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  New owner uploads will appear here when they target your issuer account.
                </p>
              </div>
            ) : (
              <div className="mt-6 space-y-4">
                {requests.map((request) => (
                  <article key={request.id} className="rounded-2xl bg-background p-5">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="text-lg font-semibold text-foreground">{request.assetName}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {request.assetCategory || "Unspecified category"} · {request.owner?.fullName || "Owner"}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {request.owner?.email || "No email"} · {request.owner?.city || "Unknown city"}
                        </p>
                      </div>
                      <StatusBadge value={request.status} />
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-3">
                      <div className="rounded-xl border border-border bg-card px-3 py-2">
                        <p className="text-xs text-muted-foreground">Submitted</p>
                        <p className="mt-1 text-sm font-medium text-foreground">{formatDate(request.submittedAt)}</p>
                      </div>
                      <div className="rounded-xl border border-border bg-card px-3 py-2">
                        <p className="text-xs text-muted-foreground">Reviewed</p>
                        <p className="mt-1 text-sm font-medium text-foreground">{formatDate(request.reviewedAt)}</p>
                      </div>
                      <div className="rounded-xl border border-border bg-card px-3 py-2">
                        <p className="text-xs text-muted-foreground">Documents</p>
                        <p className="mt-1 text-sm font-medium text-foreground">{request.attachments.length}</p>
                      </div>
                    </div>

                    {request.ownerNote ? (
                      <div className="mt-4 rounded-2xl border border-border bg-card p-4">
                        <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Owner note</p>
                        <p className="mt-2 text-sm leading-6 text-foreground">{request.ownerNote}</p>
                      </div>
                    ) : null}

                    <div className="mt-4">
                      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Documents</p>
                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                        {request.attachments.map((attachment) => (
                          <button
                            key={attachment.id}
                            type="button"
                            onClick={() => void openFile(attachment.id)}
                            className="rounded-2xl border border-border bg-card p-4 text-left transition-colors hover:border-ring/40"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-foreground">{attachment.name}</p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                  {formatAttachmentSize(attachment.sizeBytes)} · Uploaded {formatDate(attachment.uploadedAt)}
                                </p>
                              </div>
                              <FileText className="h-5 w-5 shrink-0 text-primary" />
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {request.status === "pending" ? (
                      <div className="mt-4 space-y-4">
                        <label className="block text-sm font-medium text-muted-foreground">
                          Review note
                          <textarea
                            value={reviewNotes[request.id] ?? ""}
                            onChange={(event) =>
                              setReviewNotes((current) => ({
                                ...current,
                                [request.id]: event.target.value,
                              }))
                            }
                            rows={3}
                            placeholder="Add optional approval context or the required rejection reason."
                            className="mt-2 w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground outline-none transition-colors focus:border-ring"
                          />
                        </label>

                        <div className="flex flex-wrap gap-3">
                          <button
                            type="button"
                            onClick={() => void reviewRequest(request.id, "approve")}
                            disabled={actingId === request.id}
                            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => void reviewRequest(request.id, "reject")}
                            disabled={actingId === request.id}
                            className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-card disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <XCircle className="h-4 w-4" />
                            Reject
                          </button>
                        </div>
                      </div>
                    ) : request.reviewerNote ? (
                      <div className="mt-4 rounded-2xl border border-border bg-card p-4">
                        <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Issuer note</p>
                        <p className="mt-2 text-sm leading-6 text-foreground">{request.reviewerNote}</p>
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </AuthGate>
  );
}

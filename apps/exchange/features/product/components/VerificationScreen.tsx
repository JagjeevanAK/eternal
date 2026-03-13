"use client";

import { useCallback, useEffect, useState } from "react";
import { FileText, ShieldCheck, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { apiFetch, openProtectedFile } from "@/lib/product-api";
import { AuthGate } from "@/features/product/components/AuthGate";
import { StatusBadge } from "@/features/product/components/StatusBadge";
import { useSession } from "@/features/product/context/SessionContext";
import { formatDate } from "@/features/product/lib/format";
import type { VerificationOwnerResponse } from "@/features/product/types";

const MAX_FILES = 5;
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

const formatAttachmentSize = (value: number) => {
  if (value >= 1024 * 1024) {
    return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  }

  if (value >= 1024) {
    return `${Math.round(value / 1024)} KB`;
  }

  return `${value} B`;
};

const emptyForm = {
  issuerId: "",
  assetName: "",
  assetCategory: "",
  ownerNote: "",
  files: [] as File[],
};

export function VerificationScreen() {
  const { token } = useSession();
  const [state, setState] = useState<VerificationOwnerResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [fileInputVersion, setFileInputVersion] = useState(0);

  const loadVerificationWorkspace = useCallback(async () => {
    if (!token) {
      setState(null);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await apiFetch<VerificationOwnerResponse>("/verification/requests", { token });
      setState(response);
      setForm((current) => ({
        ...current,
        issuerId: current.issuerId || response.issuers[0]?.id || "",
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load verification requests.";
      setState(null);
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadVerificationWorkspace();
  }, [loadVerificationWorkspace]);

  const submit = async () => {
    if (!token) {
      return;
    }

    if (!form.issuerId || !form.assetName.trim()) {
      toast.error("Select an issuer and enter the asset name.");
      return;
    }

    if (form.files.length === 0) {
      toast.error("Upload at least one document.");
      return;
    }

    if (form.files.length > MAX_FILES) {
      toast.error(`Upload no more than ${MAX_FILES} documents per request.`);
      return;
    }

    for (const file of form.files) {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        toast.error("Each document must be 10 MB or smaller.");
        return;
      }
    }

    setSubmitting(true);

    try {
      const payload = new FormData();
      payload.append("issuerId", form.issuerId);
      payload.append("assetName", form.assetName.trim());

      if (form.assetCategory.trim()) {
        payload.append("assetCategory", form.assetCategory.trim());
      }

      if (form.ownerNote.trim()) {
        payload.append("ownerNote", form.ownerNote.trim());
      }

      form.files.forEach((file) => {
        payload.append("documents", file);
      });

      await apiFetch<{ request: unknown }>("/verification/requests", {
        method: "POST",
        token,
        body: payload,
      });

      const refreshedState = await apiFetch<VerificationOwnerResponse>("/verification/requests", { token });
      setState(refreshedState);
      setError(null);
      setForm({
        ...emptyForm,
        issuerId: refreshedState.issuers[0]?.id || "",
      });
      setFileInputVersion((current) => current + 1);
      toast.success("Verification request submitted.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to submit verification request.");
    } finally {
      setSubmitting(false);
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

  return (
    <AuthGate allowedRoles={["investor"]}>
      {loading ? (
        <div className="rounded-[2rem] border border-border bg-card p-8 text-sm text-muted-foreground">
          Loading verification workspace...
        </div>
      ) : error ? (
        <div className="rounded-[2rem] border border-destructive/30 bg-card p-8">
          <h1 className="text-2xl font-semibold text-foreground">Verification workspace unavailable</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">{error}</p>
          <button
            type="button"
            onClick={() => void loadVerificationWorkspace()}
            className="mt-6 rounded-2xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            Retry
          </button>
        </div>
      ) : !state ? (
        <div className="rounded-[2rem] border border-border bg-card p-8 text-sm text-muted-foreground">
          Verification workspace is not available right now.
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[0.95fr,1.05fr]">
          <section className="rounded-[2rem] border border-border bg-card p-6">
            <div className="flex items-start gap-4">
              <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                <UploadCloud className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
                  Owner verification
                </p>
                <h1 className="mt-3 text-3xl font-semibold text-foreground">Submit asset proof for issuer review</h1>
              </div>
            </div>

            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              Upload the ownership documents for your asset, choose the issuer who should review them, and track the
              decision from this workspace.
            </p>

            {state.issuers.length === 0 ? (
              <div className="mt-6 rounded-2xl border border-secondary/30 bg-secondary/10 p-4 text-sm text-secondary-foreground">
                No issuers are available for review yet.
              </div>
            ) : (
              <div className="mt-6 grid gap-4">
                <label className="text-sm font-medium text-muted-foreground">
                  Issuer
                  <select
                    value={form.issuerId}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        issuerId: event.target.value,
                      }))
                    }
                    className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition-colors focus:border-ring"
                  >
                    {state.issuers.map((issuer) => (
                      <option key={issuer.id} value={issuer.id}>
                        {issuer.fullName} · {issuer.city}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="text-sm font-medium text-muted-foreground">
                  Asset name
                  <input
                    value={form.assetName}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        assetName: event.target.value,
                      }))
                    }
                    placeholder="Whitefield office floor"
                    className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition-colors focus:border-ring"
                  />
                </label>

                <label className="text-sm font-medium text-muted-foreground">
                  Asset category
                  <input
                    value={form.assetCategory}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        assetCategory: event.target.value,
                      }))
                    }
                    placeholder="Commercial real estate"
                    className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition-colors focus:border-ring"
                  />
                </label>

                <label className="text-sm font-medium text-muted-foreground">
                  Supporting note
                  <textarea
                    value={form.ownerNote}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        ownerNote: event.target.value,
                      }))
                    }
                    rows={4}
                    placeholder="Explain what is included in the upload or what the issuer should verify first."
                    className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition-colors focus:border-ring"
                  />
                </label>

                <label className="text-sm font-medium text-muted-foreground">
                  Documents
                  <input
                    key={fileInputVersion}
                    type="file"
                    multiple
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        files: Array.from(event.target.files ?? []).slice(0, MAX_FILES),
                      }))
                    }
                    className="mt-2 block w-full rounded-2xl border border-dashed border-border bg-background px-4 py-3 text-sm text-muted-foreground file:mr-4 file:rounded-xl file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-medium file:text-primary-foreground"
                  />
                </label>

                <div className="rounded-2xl bg-background p-4">
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-sm font-medium text-foreground">Selected files</p>
                    <p className="text-xs text-muted-foreground">PDF, JPG, PNG · up to 5 files · 10 MB each</p>
                  </div>
                  {form.files.length === 0 ? (
                    <p className="mt-3 text-sm text-muted-foreground">No files selected yet.</p>
                  ) : (
                    <div className="mt-3 space-y-2">
                      {form.files.map((file) => (
                        <div
                          key={`${file.name}-${file.size}-${file.lastModified}`}
                          className="flex items-center justify-between gap-4 rounded-xl border border-border px-3 py-2"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-foreground">{file.name}</p>
                            <p className="text-xs text-muted-foreground">{formatAttachmentSize(file.size)}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              setForm((current) => ({
                                ...current,
                                files: current.files.filter(
                                  (candidate) =>
                                    candidate.name !== file.name || candidate.lastModified !== file.lastModified,
                                ),
                              }))
                            }
                            className="rounded-xl border border-border px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-card"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  onClick={submit}
                  disabled={submitting || state.issuers.length === 0}
                  className="rounded-2xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? "Submitting..." : "Submit verification request"}
                </button>
              </div>
            )}
          </section>

          <section className="rounded-[2rem] border border-border bg-card p-6">
            <div className="flex items-start gap-4">
              <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">Request history</p>
                <h2 className="mt-3 text-2xl font-semibold text-foreground">Track every issuer decision</h2>
              </div>
            </div>

            {state.requests.length === 0 ? (
              <div className="mt-6 rounded-2xl border border-border bg-background p-5">
                <p className="text-sm font-medium text-foreground">No verification requests yet.</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Your uploaded asset proof and issuer decisions will appear here.
                </p>
              </div>
            ) : (
              <div className="mt-6 space-y-4">
                {state.requests.map((request) => (
                  <article key={request.id} className="rounded-2xl bg-background p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-lg font-semibold text-foreground">{request.assetName}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {request.assetCategory || "Unspecified category"} · {request.issuer?.fullName || "Issuer"}
                        </p>
                      </div>
                      <StatusBadge value={request.status} />
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <div className="rounded-xl border border-border bg-card px-3 py-2">
                        <p className="text-xs text-muted-foreground">Submitted</p>
                        <p className="mt-1 text-sm font-medium text-foreground">{formatDate(request.submittedAt)}</p>
                      </div>
                      <div className="rounded-xl border border-border bg-card px-3 py-2">
                        <p className="text-xs text-muted-foreground">Reviewed</p>
                        <p className="mt-1 text-sm font-medium text-foreground">{formatDate(request.reviewedAt)}</p>
                      </div>
                    </div>

                    {request.ownerNote ? (
                      <div className="mt-4 rounded-2xl border border-border bg-card p-4">
                        <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Owner note</p>
                        <p className="mt-2 text-sm leading-6 text-foreground">{request.ownerNote}</p>
                      </div>
                    ) : null}

                    {request.reviewerNote ? (
                      <div className="mt-4 rounded-2xl border border-border bg-card p-4">
                        <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Issuer note</p>
                        <p className="mt-2 text-sm leading-6 text-foreground">{request.reviewerNote}</p>
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

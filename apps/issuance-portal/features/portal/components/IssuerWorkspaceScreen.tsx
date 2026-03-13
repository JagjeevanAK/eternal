"use client";

import { useCallback, useEffect, useState } from "react";
import { FileText, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/product-api";
import { AuthGate } from "@/features/portal/components/AuthGate";
import { StatusBadge } from "@/features/portal/components/StatusBadge";
import { useSession } from "@/features/portal/context/SessionContext";
import { formatFileSize, formatInr, formatPercent } from "@/features/portal/lib/format";
import type { IssuerProjectsResponse } from "@/features/portal/types";

const MAX_FILES = 5;
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

const emptyForm = {
  assetClass: "real_estate",
  assetType: "",
  symbol: "",
  name: "",
  city: "",
  state: "",
  marketSegment: "",
  registrationRef: "",
  summary: "",
  structureName: "",
  targetYieldBps: "980",
  targetIrrBps: "1480",
  expectedExitMonths: "60",
  minimumInvestmentInrMinor: "250000",
  unitPriceInrMinor: "25000",
  totalUnits: "1000",
};

const requiredFieldKeys = [
  "assetClass",
  "assetType",
  "symbol",
  "name",
  "city",
  "state",
  "marketSegment",
  "registrationRef",
  "summary",
  "structureName",
  "targetYieldBps",
  "targetIrrBps",
  "expectedExitMonths",
  "minimumInvestmentInrMinor",
  "unitPriceInrMinor",
  "totalUnits",
] as const;

const RequiredMark = () => <span className="ml-1 text-destructive">*</span>;

export function IssuerWorkspaceScreen() {
  const { token } = useSession();
  const [state, setState] = useState<IssuerProjectsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const [files, setFiles] = useState<File[]>([]);
  const [fileInputVersion, setFileInputVersion] = useState(0);

  const load = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const response = await apiFetch<IssuerProjectsResponse>("/issuer/projects", { token });
      setState(response);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load issuer workspace.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const validateFiles = (selectedFiles: File[]) => {
    if (selectedFiles.length === 0) {
      toast.error("Upload at least one document.");
      return false;
    }

    if (selectedFiles.length > MAX_FILES) {
      toast.error(`Upload no more than ${MAX_FILES} documents.`);
      return false;
    }

    for (const file of selectedFiles) {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        toast.error("Each document must be 10 MB or smaller.");
        return false;
      }
    }

    return true;
  };

  const handleFileChange = (nextFiles: File[]) => {
    if (!validateFiles(nextFiles)) {
      setFiles([]);
      setFileInputVersion((current) => current + 1);
      return;
    }

    setFiles(nextFiles);
  };

  const submit = async () => {
    if (!token) {
      return;
    }

    for (const key of requiredFieldKeys) {
      if (!formData[key].trim()) {
        toast.error("Fill all required asset details before submitting.");
        return;
      }
    }

    if (!validateFiles(files)) {
      return;
    }

    setSubmitting(true);

    try {
      const payload = new FormData();
      payload.append("assetClass", formData.assetClass);
      payload.append("assetType", formData.assetType.trim());
      payload.append("symbol", formData.symbol.trim());
      payload.append("name", formData.name.trim());
      payload.append("city", formData.city.trim());
      payload.append("state", formData.state.trim());
      payload.append("marketSegment", formData.marketSegment.trim());
      payload.append("registrationRef", formData.registrationRef.trim());
      payload.append("summary", formData.summary.trim());
      payload.append("structureName", formData.structureName.trim());
      payload.append("targetYieldBps", formData.targetYieldBps.trim());
      payload.append("targetIrrBps", formData.targetIrrBps.trim());
      payload.append("expectedExitMonths", formData.expectedExitMonths.trim());
      payload.append("minimumInvestmentInrMinor", formData.minimumInvestmentInrMinor.trim());
      payload.append("unitPriceInrMinor", formData.unitPriceInrMinor.trim());
      payload.append("totalUnits", formData.totalUnits.trim());
      files.forEach((file) => payload.append("documents", file));

      await apiFetch<{ property: unknown }>("/issuer/projects", {
        method: "POST",
        token,
        body: payload,
      });

      toast.success("Asset issue submitted into the review queue.");
      setFormData(emptyForm);
      setFiles([]);
      setFileInputVersion((current) => current + 1);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to submit the asset issue.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthGate allowedRoles={["issuer"]}>
      {loading || !state ? (
        <div className="rounded-[2rem] border border-border bg-card p-8 text-sm text-muted-foreground">
          Loading issuer workspace...
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1.1fr,0.9fr]">
          <section className="rounded-[2rem] border border-border bg-card p-6">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">Issuer desk</p>
            <h1 className="mt-3 text-3xl font-semibold text-foreground">Asset issues and review states</h1>
            <div className="mt-6 space-y-4">
              {state.properties.map((property) => (
                <div key={property.id} className="rounded-2xl bg-background p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-lg font-semibold text-foreground">{property.name}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {property.assetClassLabel} · {property.symbol} · {property.structureName}
                      </p>
                    </div>
                    <StatusBadge value={property.status} />
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <div className="rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground">
                      Minimum {formatInr(property.minimumInvestmentInrMinor)}
                    </div>
                    <div className="rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground">
                      Yield {formatPercent(property.targetYieldBps)}
                    </div>
                    <div className="rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground">
                      {property.availableUnits} units open
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[2rem] border border-border bg-card p-6">
            <h2 className="text-2xl font-semibold text-foreground">Submit a new asset issue</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Submit company-share or real-estate issues here, along with the supporting documents the admin team needs
              to review before tokenization.
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              <RequiredMark /> Required fields
            </p>

            <div className="mt-6 grid gap-4">
              <label className="text-sm font-medium text-muted-foreground">
                Asset class
                <RequiredMark />
                <select
                  value={formData.assetClass}
                  onChange={(event) =>
                    setFormData((current) => ({
                      ...current,
                      assetClass: event.target.value,
                    }))
                  }
                  required
                  className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition-colors focus:border-ring"
                >
                  <option value="real_estate">Real estate</option>
                  <option value="company_share">Company shares</option>
                </select>
              </label>

              {[
                ["assetType", formData.assetClass === "company_share" ? "Asset type / round" : "Asset type"],
                ["symbol", "Ticker / unit symbol"],
                ["name", "Asset name"],
                ["city", "City"],
                ["state", "State"],
                ["marketSegment", formData.assetClass === "company_share" ? "Sector" : "Micro market"],
                ["registrationRef", formData.assetClass === "company_share" ? "CIN / issue reference" : "Registry / RERA"],
                ["structureName", formData.assetClass === "company_share" ? "Issuer vehicle" : "SPV name"],
                ["summary", "Summary"],
                ["targetYieldBps", "Target yield (bps)"],
                ["targetIrrBps", "Target IRR (bps)"],
                ["expectedExitMonths", "Expected exit (months)"],
                ["minimumInvestmentInrMinor", "Minimum investment (INR)"],
                ["unitPriceInrMinor", "Unit price (INR)"],
                ["totalUnits", "Total units"],
              ].map(([key, label]) => (
                <label key={key} className="text-sm font-medium text-muted-foreground">
                  {label}
                  <RequiredMark />
                  {key === "summary" ? (
                    <textarea
                      value={formData[key as keyof typeof formData]}
                      onChange={(event) =>
                        setFormData((current) => ({ ...current, [key]: event.target.value }))
                      }
                      rows={4}
                      required
                      className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition-colors focus:border-ring"
                    />
                  ) : (
                    <input
                      value={formData[key as keyof typeof formData]}
                      onChange={(event) =>
                        setFormData((current) => ({ ...current, [key]: event.target.value }))
                      }
                      required
                      className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition-colors focus:border-ring"
                    />
                  )}
                </label>
              ))}

              <label className="text-sm font-medium text-muted-foreground">
                Supporting documents
                <RequiredMark />
                <div className="mt-2 rounded-[1.6rem] border border-dashed border-border bg-background p-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                      <UploadCloud className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground">
                        Upload the issuer-side asset pack for admin review.
                      </p>
                      <p className="mt-1 text-xs leading-6 text-muted-foreground">
                        PDF, JPG, or PNG only. Up to {MAX_FILES} files, 10 MB each.
                      </p>
                      <input
                        key={fileInputVersion}
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
                        multiple
                        required
                        onChange={(event) =>
                          handleFileChange(Array.from(event.target.files ?? []))
                        }
                        className="mt-4 block w-full text-sm text-muted-foreground file:mr-4 file:rounded-xl file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary-foreground"
                      />
                    </div>
                  </div>

                  {files.length > 0 ? (
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      {files.map((file) => (
                        <div
                          key={`${file.name}-${file.lastModified}`}
                          className="rounded-2xl border border-border bg-card px-4 py-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-foreground">{file.name}</p>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {formatFileSize(file.size)} · {file.type || "Unknown type"}
                              </p>
                            </div>
                            <FileText className="h-4 w-4 shrink-0 text-primary" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              </label>
            </div>

            <button
              onClick={submit}
              disabled={submitting}
              className="mt-5 rounded-2xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Submitting..." : "Submit issue to admin review"}
            </button>
          </section>
        </div>
      )}
    </AuthGate>
  );
}

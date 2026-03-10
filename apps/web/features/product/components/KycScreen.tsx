"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/product-api";
import { AuthGate } from "@/features/product/components/AuthGate";
import { StatusBadge } from "@/features/product/components/StatusBadge";
import { useSession } from "@/features/product/context/SessionContext";
import { formatDate } from "@/features/product/lib/format";
import type { KycRecord } from "@/features/product/types";

export function KycScreen() {
  const { token, refreshSession } = useSession();
  const [record, setRecord] = useState<KycRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    panMasked: "",
    aadhaarMasked: "",
    occupation: "",
    annualIncomeBand: "10L - 25L",
  });

  useEffect(() => {
    const load = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await apiFetch<{ record: KycRecord | null }>("/kyc", { token });
        setRecord(response.record);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to load KYC status.");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [token]);

  const submit = async () => {
    if (!token) {
      return;
    }

    try {
      const response = await apiFetch<{ record: KycRecord }>("/kyc/submit", {
        method: "POST",
        token,
        body: formData,
      });

      setRecord(response.record);
      await refreshSession();
      toast.success("KYC submitted for review.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to submit KYC.");
    }
  };

  return (
    <AuthGate>
      <div className="mx-auto max-w-3xl">
        <div className="rounded-[2rem] border border-border bg-card p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">Investor KYC</p>
              <h1 className="mt-3 text-3xl font-semibold text-foreground">Compliance onboarding</h1>
            </div>
            <StatusBadge value={record?.status ?? "not_started"} />
          </div>

          {loading ? (
            <p className="mt-6 text-sm text-muted-foreground">Loading compliance record...</p>
          ) : record?.status === "approved" ? (
            <div className="mt-6 rounded-2xl bg-background p-5">
              <p className="text-lg font-semibold text-foreground">You are approved.</p>
              <p className="mt-2 text-sm text-muted-foreground">Reviewed on {formatDate(record.reviewedAt)}</p>
            </div>
          ) : record?.status === "pending" ? (
            <div className="mt-6 rounded-2xl bg-background p-5">
              <p className="text-lg font-semibold text-foreground">Review in progress</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Submitted on {formatDate(record.submittedAt)}. The admin queue will unlock investment after approval.
              </p>
            </div>
          ) : (
            <div className="mt-6 grid gap-4">
              <label className="text-sm font-medium text-muted-foreground">
                PAN
                <input
                  value={formData.panMasked}
                  onChange={(event) => setFormData((current) => ({ ...current, panMasked: event.target.value }))}
                  placeholder="ABCDE1234F"
                  className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition-colors focus:border-ring"
                />
              </label>
              <label className="text-sm font-medium text-muted-foreground">
                Aadhaar last 4 digits
                <input
                  value={formData.aadhaarMasked}
                  onChange={(event) =>
                    setFormData((current) => ({ ...current, aadhaarMasked: event.target.value }))
                  }
                  placeholder="1234"
                  className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition-colors focus:border-ring"
                />
              </label>
              <label className="text-sm font-medium text-muted-foreground">
                Occupation
                <input
                  value={formData.occupation}
                  onChange={(event) => setFormData((current) => ({ ...current, occupation: event.target.value }))}
                  placeholder="Founder"
                  className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition-colors focus:border-ring"
                />
              </label>
              <label className="text-sm font-medium text-muted-foreground">
                Annual income band
                <select
                  value={formData.annualIncomeBand}
                  onChange={(event) =>
                    setFormData((current) => ({ ...current, annualIncomeBand: event.target.value }))
                  }
                  className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition-colors focus:border-ring"
                >
                  <option>10L - 25L</option>
                  <option>25L - 50L</option>
                  <option>Above 50L</option>
                </select>
              </label>
              <button
                onClick={submit}
                className="rounded-2xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
              >
                Submit KYC for review
              </button>
            </div>
          )}
        </div>
      </div>
    </AuthGate>
  );
}

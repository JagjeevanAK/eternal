"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/product-api";
import { AuthGate } from "@/features/product/components/AuthGate";
import { StatusBadge } from "@/features/product/components/StatusBadge";
import { useSession } from "@/features/product/context/SessionContext";
import { formatInr, formatPercent } from "@/features/product/lib/format";
import type { IssuerProjectsResponse } from "@/features/product/types";

export function IssuerWorkspaceScreen() {
  const { token } = useSession();
  const [state, setState] = useState<IssuerProjectsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
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
  });

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

  const submit = async () => {
    if (!token) {
      return;
    }

    try {
      await apiFetch<{ property: unknown }>("/issuer/projects", {
        method: "POST",
        token,
        body: {
          ...formData,
          targetYieldBps: Number(formData.targetYieldBps),
          targetIrrBps: Number(formData.targetIrrBps),
          expectedExitMonths: Number(formData.expectedExitMonths),
          minimumInvestmentInrMinor: Number(formData.minimumInvestmentInrMinor),
          unitPriceInrMinor: Number(formData.unitPriceInrMinor),
          totalUnits: Number(formData.totalUnits),
        },
      });

      toast.success("Asset issue submitted into the review queue.");
      setFormData({
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
      });
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to submit the asset issue.");
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
              Submit company-share or real-estate issues here. New submissions go into the admin review queue and can
              be published locally once approved.
            </p>

            <div className="mt-6 grid gap-4">
              <label className="text-sm font-medium text-muted-foreground">
                Asset class
                <select
                  value={formData.assetClass}
                  onChange={(event) =>
                    setFormData((current) => ({
                      ...current,
                      assetClass: event.target.value,
                    }))
                  }
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
                  {key === "summary" ? (
                    <textarea
                      value={formData[key as keyof typeof formData]}
                      onChange={(event) =>
                        setFormData((current) => ({ ...current, [key]: event.target.value }))
                      }
                      rows={4}
                      className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition-colors focus:border-ring"
                    />
                  ) : (
                    <input
                      value={formData[key as keyof typeof formData]}
                      onChange={(event) =>
                        setFormData((current) => ({ ...current, [key]: event.target.value }))
                      }
                      className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition-colors focus:border-ring"
                    />
                  )}
                </label>
              ))}
            </div>

            <button
              onClick={submit}
              className="mt-5 rounded-2xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              Submit issue to admin review
            </button>
          </section>
        </div>
      )}
    </AuthGate>
  );
}

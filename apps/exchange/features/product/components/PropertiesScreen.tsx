"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Building2, MapPin, TrendingUp } from "lucide-react";
import { apiFetch } from "@/lib/product-api";
import { formatInr, formatPercent } from "@/features/product/lib/format";
import type { AssetClass, PropertySummary } from "@/features/product/types";
import { StatusBadge } from "@/features/product/components/StatusBadge";

export function PropertiesScreen() {
  const [properties, setProperties] = useState<PropertySummary[]>([]);
  const [assetFilter, setAssetFilter] = useState<"all" | AssetClass>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await apiFetch<{ properties: PropertySummary[] }>("/assets");
        setProperties(response.properties);
      } catch (value) {
        setError(value instanceof Error ? value.message : "Failed to load live assets.");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const filteredProperties = useMemo(
    () =>
      properties.filter((property) =>
        assetFilter === "all" ? true : property.assetClass === assetFilter,
      ),
    [assetFilter, properties],
  );

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Live marketplace
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-foreground">Browse approved live assets</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
            Browse company-share offerings and real-estate inventory that already cleared review. Drafts, owner proof
            checks, and publishing workflows now live in the separate issuance portal.
          </p>
        </div>
        <Link
          href="/login"
          className="rounded-2xl border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-card"
        >
          Sign in for portfolio actions
        </Link>
      </div>

      {loading ? (
        <div className="mt-8 rounded-[2rem] border border-border bg-card p-8 text-sm text-muted-foreground">
          Loading live assets...
        </div>
      ) : error ? (
        <div className="mt-8 rounded-[2rem] border border-destructive/30 bg-destructive/10 p-8 text-sm text-destructive">
          {error}
        </div>
      ) : (
        <>
          <div className="mt-8 flex flex-wrap gap-3">
            {[
              { value: "all", label: "All assets" },
              { value: "real_estate", label: "Real estate" },
              { value: "company_share", label: "Company shares" },
            ].map((item) => (
              <button
                key={item.value}
                onClick={() => setAssetFilter(item.value as "all" | AssetClass)}
                className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                  assetFilter === item.value
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground hover:text-foreground"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="mt-8 grid gap-5 lg:grid-cols-2">
            {filteredProperties.map((property) => (
            <Link
              key={property.id}
              href={`/marketplace/${property.slug}`}
              className="rounded-[2rem] border border-border bg-card p-6 transition-colors hover:border-ring/40"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">{property.heroTag}</p>
                  <h2 className="mt-2 text-2xl font-semibold text-foreground">{property.name}</h2>
                  <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span>
                      {property.city}, {property.state}
                    </span>
                  </div>
                </div>
                <StatusBadge value={property.status} />
              </div>

              <p className="mt-4 text-sm leading-6 text-muted-foreground">{property.summary}</p>

              <div className="mt-6 grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl bg-background p-4">
                  <p className="text-xs text-muted-foreground">{property.assetClassLabel}</p>
                  <p className="mt-2 text-lg font-semibold text-foreground">{property.assetType}</p>
                </div>
                <div className="rounded-2xl bg-background p-4">
                  <p className="text-xs text-muted-foreground">Minimum ticket</p>
                  <p className="mt-2 text-lg font-semibold text-foreground">{formatInr(property.minimumInvestmentInrMinor)}</p>
                </div>
                <div className="rounded-2xl bg-background p-4">
                  <p className="text-xs text-muted-foreground">Unit price</p>
                  <p className="mt-2 text-lg font-semibold text-foreground">{formatInr(property.unitPriceInrMinor)}</p>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Building2 className="h-4 w-4" />
                  <span>
                    {property.symbol} · {property.structureName}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-primary">
                  <TrendingUp className="h-4 w-4" />
                  <span>
                    {property.fundedPercent}% funded · {formatPercent(property.targetIrrBps)} target IRR
                  </span>
                </div>
              </div>
            </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Building2, MapPin, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/product-api";
import { EmptyState, Notice, ScreenHeader } from "@/features/exchange/components/ExchangePrimitives";
import { StatusBadge } from "@/features/exchange/components/StatusBadge";
import { formatInr, formatPercent } from "@/features/exchange/lib/format";
import type { AssetClass, PropertySummary } from "@/features/exchange/types";

export function MarketplaceScreen() {
  const [properties, setProperties] = useState<PropertySummary[]>([]);
  const [assetFilter, setAssetFilter] = useState<"all" | AssetClass>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const response = await apiFetch<{ properties: PropertySummary[] }>("/properties");
        if (!cancelled) {
          setProperties(response.properties);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Failed to load live assets.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredProperties = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return properties.filter((property) => {
      if (assetFilter !== "all" && property.assetClass !== assetFilter) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      return [
        property.name,
        property.symbol,
        property.city,
        property.state,
        property.assetType,
        property.marketSegment,
        property.issuerName,
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery);
    });
  }, [assetFilter, properties, searchQuery]);

  return (
    <div className="space-y-6">
      <ScreenHeader
        eyebrow="Marketplace"
        title="Browse approved live assets"
        description="Explore primary offerings and active secondary liquidity from a dedicated market route instead of a single consolidated exchange screen."
      />

      {error ? <Notice tone="error">{error}</Notice> : null}

      <Card className="border-border bg-card/92 shadow-2xl backdrop-blur">
        <CardHeader className="gap-4">
          <CardTitle className="text-2xl">Filters</CardTitle>
          <div className="flex flex-col gap-3 lg:flex-row">
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search Whitefield, logistics, Gurgaon..."
              className="lg:max-w-md"
            />
            <div className="flex flex-wrap gap-2">
              {[
                { value: "all", label: "All assets" },
                { value: "real_estate", label: "Real estate" },
                { value: "company_share", label: "Company shares" },
              ].map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setAssetFilter(item.value as "all" | AssetClass)}
                  className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                    assetFilter === item.value
                      ? "border-primary/20 bg-primary/10 text-primary"
                      : "border-border bg-card/80 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
      </Card>

      {loading ? (
        <Card className="border-border bg-card/92 shadow-2xl backdrop-blur">
          <CardContent className="px-6 py-10 text-sm text-muted-foreground">
            Loading live marketplace inventory...
          </CardContent>
        </Card>
      ) : filteredProperties.length ? (
        <div className="grid gap-5 lg:grid-cols-2">
          {filteredProperties.map((property) => (
            <Link
              key={property.id}
              href={`/marketplace/${property.slug}`}
              className="block rounded-[1.8rem] border border-border bg-card/92 p-6 shadow-2xl backdrop-blur transition-colors hover:border-primary/20"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <Badge variant="muted">{property.heroTag}</Badge>
                  <h2 className="mt-4 text-2xl font-semibold text-foreground">{property.name}</h2>
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
                <div className="rounded-[1.2rem] border border-border bg-card/80 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    Asset type
                  </p>
                  <p className="mt-2 text-lg font-semibold text-foreground">{property.assetType}</p>
                </div>
                <div className="rounded-[1.2rem] border border-border bg-card/80 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    Minimum ticket
                  </p>
                  <p className="mt-2 text-lg font-semibold text-foreground">
                    {formatInr(property.minimumInvestmentInrMinor)}
                  </p>
                </div>
                <div className="rounded-[1.2rem] border border-border bg-card/80 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    Unit price
                  </p>
                  <p className="mt-2 text-lg font-semibold text-foreground">
                    {formatInr(property.unitPriceInrMinor)}
                  </p>
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-3 text-sm md:flex-row md:items-center md:justify-between">
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
      ) : (
        <EmptyState
          title="No matching assets"
          description="Adjust the asset type filter or search terms to widen the live catalogue."
        />
      )}
    </div>
  );
}

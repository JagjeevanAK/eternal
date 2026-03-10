"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { apiFetch } from "@/lib/product-api";
import { AuthGate } from "@/features/product/components/AuthGate";
import { StatusBadge } from "@/features/product/components/StatusBadge";
import { useSession } from "@/features/product/context/SessionContext";
import { formatDate, formatInr } from "@/features/product/lib/format";
import type { OrdersResponse } from "@/features/product/types";

export function OrdersScreen() {
  const { token } = useSession();
  const [state, setState] = useState<OrdersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const compactValue = (value: string) => `${value.slice(0, 6)}...${value.slice(-6)}`;

  useEffect(() => {
    const load = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await apiFetch<OrdersResponse>("/orders", { token });
        setState(response);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to load orders.");
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
          Loading orders...
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">Orders</p>
            <h1 className="mt-3 text-3xl font-semibold text-foreground">Primary issues and fixed-price trades</h1>
          </div>

          {state.orders.map((order) => (
            <div key={order.id} className="rounded-[2rem] border border-border bg-card p-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">{order.kind}</p>
                  <h2 className="mt-2 text-xl font-semibold text-foreground">{order.property.name}</h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {order.property.assetClassLabel} · {order.units} units at {formatInr(order.pricePerUnitInrMinor)} each
                  </p>
                </div>
                <StatusBadge value={order.status} />
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-4">
                <div className="rounded-2xl bg-background p-4">
                  <p className="text-xs text-muted-foreground">Gross amount</p>
                  <p className="mt-2 text-sm font-semibold text-foreground">{formatInr(order.grossAmountInrMinor)}</p>
                </div>
                <div className="rounded-2xl bg-background p-4">
                  <p className="text-xs text-muted-foreground">Fee</p>
                  <p className="mt-2 text-sm font-semibold text-foreground">{formatInr(order.feeAmountInrMinor)}</p>
                </div>
                <div className="rounded-2xl bg-background p-4">
                  <p className="text-xs text-muted-foreground">Created</p>
                  <p className="mt-2 text-sm font-semibold text-foreground">{formatDate(order.createdAt)}</p>
                </div>
                <div className="rounded-2xl bg-background p-4">
                  <p className="text-xs text-muted-foreground">Payment status</p>
                  <p className="mt-2 text-sm font-semibold text-foreground">
                    {order.payment ? order.payment.status : "Not linked"}
                  </p>
                </div>
              </div>

              <div className="mt-4">
                {order.settlementSignature ? (
                  <p className="mb-2 text-xs text-muted-foreground">
                    Localnet signature: {compactValue(order.settlementSignature)}
                  </p>
                ) : null}
                {order.onChainTradeAddress ? (
                  <p className="mb-2 text-xs text-muted-foreground">
                    Trade record: {compactValue(order.onChainTradeAddress)}
                  </p>
                ) : null}
                <Link
                  href={`/marketplace/${order.property.slug}`}
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  Open asset room
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </AuthGate>
  );
}

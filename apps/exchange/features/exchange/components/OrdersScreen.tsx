"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { apiFetch } from "@/lib/product-api";
import { AuthGate } from "@/features/exchange/components/AuthGate";
import { EmptyState, Notice, ScreenHeader } from "@/features/exchange/components/ExchangePrimitives";
import { StatusBadge } from "@/features/exchange/components/StatusBadge";
import { useSession } from "@/features/exchange/context/SessionContext";
import { formatDate, formatInr, formatUnits, truncateAddress } from "@/features/exchange/lib/format";
import type { OrderRecord } from "@/features/exchange/types";

export function OrdersScreen() {
  const { token } = useSession();
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) {
      setOrders([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await apiFetch<{ orders: OrderRecord[] }>("/orders", { token });
      setOrders(response.orders);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load orders.");
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
          eyebrow="Orders"
          title="Primary subscriptions and secondary trades"
          description="Review your execution trail, payment linkage, and settlement metadata from a dedicated orders page."
        />

        {error ? <Notice tone="error">{error}</Notice> : null}

        {loading ? (
          <Card className="border-white/70 bg-card/92 shadow-2xl shadow-sky-950/10 backdrop-blur">
            <CardContent className="px-6 py-10 text-sm text-muted-foreground">
              Loading orders...
            </CardContent>
          </Card>
        ) : orders.length ? (
          <div className="space-y-4">
            {orders.map((order) => (
              <Card
                key={order.id}
                className="border-white/70 bg-card/92 shadow-2xl shadow-sky-950/10 backdrop-blur"
              >
                <CardContent className="space-y-5 px-6 py-6">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        {order.kind}
                      </p>
                      <h2 className="mt-2 text-2xl font-semibold text-foreground">
                        {order.property.name}
                      </h2>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {formatUnits(order.units)} units at {formatInr(order.pricePerUnitInrMinor)} each
                      </p>
                    </div>
                    <StatusBadge value={order.status} />
                  </div>

                  <div className="grid gap-3 md:grid-cols-4">
                    <div className="rounded-[1.2rem] border border-white/70 bg-white/80 p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                        Gross amount
                      </p>
                      <p className="mt-2 font-semibold text-foreground">
                        {formatInr(order.grossAmountInrMinor)}
                      </p>
                    </div>
                    <div className="rounded-[1.2rem] border border-white/70 bg-white/80 p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                        Fee
                      </p>
                      <p className="mt-2 font-semibold text-foreground">
                        {formatInr(order.feeAmountInrMinor)}
                      </p>
                    </div>
                    <div className="rounded-[1.2rem] border border-white/70 bg-white/80 p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                        Created
                      </p>
                      <p className="mt-2 font-semibold text-foreground">
                        {formatDate(order.createdAt)}
                      </p>
                    </div>
                    <div className="rounded-[1.2rem] border border-white/70 bg-white/80 p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                        Payment
                      </p>
                      <p className="mt-2 font-semibold text-foreground">
                        {order.payment?.status ?? "Not linked"}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 text-sm text-muted-foreground">
                    {order.settlementSignature ? (
                      <p>Settlement signature {truncateAddress(order.settlementSignature)}</p>
                    ) : null}
                    {order.onChainTradeAddress ? (
                      <p>Trade record {truncateAddress(order.onChainTradeAddress)}</p>
                    ) : null}
                    <div>
                      <Link
                        href={`/marketplace/${order.property.slug}`}
                        className="text-primary transition-colors hover:text-primary/80"
                      >
                        Open asset room
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No orders yet"
            description="Create a primary order or buy a live listing to start building execution history."
          />
        )}
      </div>
    </AuthGate>
  );
}

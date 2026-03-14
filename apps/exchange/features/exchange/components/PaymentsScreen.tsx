"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/product-api";
import { AuthGate } from "@/features/exchange/components/AuthGate";
import { EmptyState, Notice, ScreenHeader } from "@/features/exchange/components/ExchangePrimitives";
import { StatusBadge } from "@/features/exchange/components/StatusBadge";
import { useSession } from "@/features/exchange/context/SessionContext";
import { formatDate, formatInr } from "@/features/exchange/lib/format";
import type { PaymentsResponse } from "@/features/exchange/types";

export function PaymentsScreen() {
  const { token } = useSession();
  const [state, setState] = useState<PaymentsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pendingPaymentId, setPendingPaymentId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) {
      setState(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await apiFetch<PaymentsResponse>("/payments", { token });
      setState(response);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load payments.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  async function markPaid(paymentId: string) {
    if (!token) {
      return;
    }

    setPendingPaymentId(paymentId);
    setError(null);
    setMessage(null);

    try {
      await apiFetch(`/payments/${paymentId}/pay`, {
        method: "POST",
        token,
      });
      setMessage("Mock INR payment captured. The worker will settle the order shortly.");
      await load();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Failed to capture payment.");
    } finally {
      setPendingPaymentId(null);
    }
  }

  return (
    <AuthGate allowedRoles={["investor"]}>
      <div className="space-y-6">
        <ScreenHeader
          eyebrow="Payments"
          title="Capture pending mock UPI payments"
          description="Payments drive settlement in the local exchange stack. Capture them here and let the worker sync the order into localnet."
        />

        {error ? <Notice tone="error">{error}</Notice> : null}
        {message ? <Notice tone="success">{message}</Notice> : null}

        {loading || !state ? (
          <Card className="border-white/70 bg-card/92 shadow-2xl shadow-sky-950/10 backdrop-blur">
            <CardContent className="px-6 py-10 text-sm text-muted-foreground">
              Loading payments...
            </CardContent>
          </Card>
        ) : (
          <>
            <Card className="border-white/70 bg-card/92 shadow-2xl shadow-sky-950/10 backdrop-blur">
              <CardContent className="px-6 py-6">
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                  Available local balance
                </p>
                <p className="mt-3 text-3xl font-semibold text-foreground">
                  {formatInr(state.cashBalanceInrMinor)}
                </p>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  Pending orders settle after payment capture and worker processing.
                </p>
              </CardContent>
            </Card>

            <div className="space-y-4">
              {state.payments.length ? (
                state.payments.map((payment) => (
                  <Card
                    key={payment.id}
                    className="border-white/70 bg-card/92 shadow-2xl shadow-sky-950/10 backdrop-blur"
                  >
                    <CardContent className="space-y-5 px-6 py-6">
                      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                            {payment.order.kind}
                          </p>
                          <h2 className="mt-2 text-2xl font-semibold text-foreground">
                            {payment.property.name}
                          </h2>
                          <p className="mt-2 text-sm text-muted-foreground">
                            {payment.reference} · {formatDate(payment.createdAt)}
                          </p>
                        </div>
                        <StatusBadge value={payment.status} />
                      </div>

                      <div className="grid gap-3 md:grid-cols-3">
                        <div className="rounded-[1.2rem] border border-white/70 bg-white/80 p-4">
                          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                            Amount
                          </p>
                          <p className="mt-2 font-semibold text-foreground">
                            {formatInr(payment.amountInrMinor)}
                          </p>
                        </div>
                        <div className="rounded-[1.2rem] border border-white/70 bg-white/80 p-4">
                          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                            Units
                          </p>
                          <p className="mt-2 font-semibold text-foreground">{payment.order.units}</p>
                        </div>
                        <div className="rounded-[1.2rem] border border-white/70 bg-white/80 p-4">
                          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                            Method
                          </p>
                          <p className="mt-2 font-semibold text-foreground">Mock UPI</p>
                        </div>
                      </div>

                      <Button
                        onClick={() => void markPaid(payment.id)}
                        disabled={pendingPaymentId !== null || payment.status !== "pending"}
                      >
                        {pendingPaymentId === payment.id
                          ? "Capturing..."
                          : payment.status === "pending"
                            ? "Capture mock payment"
                            : "Payment captured"}
                      </Button>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <EmptyState
                  title="No payment intents"
                  description="Orders generate payments automatically. They will appear here once created."
                />
              )}
            </div>
          </>
        )}
      </div>
    </AuthGate>
  );
}

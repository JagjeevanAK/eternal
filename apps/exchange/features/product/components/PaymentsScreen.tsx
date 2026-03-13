"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/product-api";
import { AuthGate } from "@/features/product/components/AuthGate";
import { StatusBadge } from "@/features/product/components/StatusBadge";
import { useSession } from "@/features/product/context/SessionContext";
import { formatDate, formatInr } from "@/features/product/lib/format";
import type { PaymentsResponse } from "@/features/product/types";

export function PaymentsScreen() {
  const { token } = useSession();
  const [state, setState] = useState<PaymentsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const response = await apiFetch<PaymentsResponse>("/payments", { token });
      setState(response);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load payments.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const markPaid = async (paymentId: string) => {
    if (!token) {
      return;
    }

    try {
      await apiFetch<{ payment: unknown }>(`/payments/${paymentId}/pay`, {
        method: "POST",
        token,
      });
      toast.success("Mock payment captured.");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to capture the payment.");
    }
  };

  return (
    <AuthGate>
      {loading || !state ? (
        <div className="rounded-[2rem] border border-border bg-card p-8 text-sm text-muted-foreground">
          Loading payments...
        </div>
      ) : (
        <div className="space-y-6">
          <div className="rounded-[2rem] border border-border bg-card p-6">
            <p className="text-sm text-muted-foreground">Available local balance</p>
            <p className="mt-3 text-3xl font-semibold text-foreground">{formatInr(state.cashBalanceInrMinor)}</p>
            <p className="mt-3 text-sm text-muted-foreground">
              Pending orders settle after you mark a payment as paid and the worker processes the localnet queue.
            </p>
          </div>

          <div className="space-y-4">
            {state.payments.map((payment) => (
              <div key={payment.id} className="rounded-[2rem] border border-border bg-card p-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">
                      {payment.order.kind}
                    </p>
                    <h2 className="mt-2 text-xl font-semibold text-foreground">{payment.property.name}</h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {payment.property.assetClassLabel} · {payment.reference} · {formatDate(payment.createdAt)}
                    </p>
                  </div>
                  <StatusBadge value={payment.status} />
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-3">
                  <div className="rounded-2xl bg-background p-4">
                    <p className="text-xs text-muted-foreground">Amount</p>
                    <p className="mt-2 text-sm font-semibold text-foreground">{formatInr(payment.amountInrMinor)}</p>
                  </div>
                  <div className="rounded-2xl bg-background p-4">
                    <p className="text-xs text-muted-foreground">Units</p>
                    <p className="mt-2 text-sm font-semibold text-foreground">{payment.order.units}</p>
                  </div>
                  <div className="rounded-2xl bg-background p-4">
                    <p className="text-xs text-muted-foreground">Method</p>
                    <p className="mt-2 text-sm font-semibold text-foreground">Mock UPI</p>
                  </div>
                </div>

                {payment.status === "pending" ? (
                  <button
                    onClick={() => markPaid(payment.id)}
                    className="mt-4 rounded-2xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
                  >
                    Mark payment paid
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      )}
    </AuthGate>
  );
}

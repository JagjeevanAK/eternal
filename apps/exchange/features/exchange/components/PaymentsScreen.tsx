"use client";

import { useCallback, useEffect, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/product-api";
import { AuthGate } from "@/features/exchange/components/AuthGate";
import { EmptyState, Notice, ScreenHeader } from "@/features/exchange/components/ExchangePrimitives";
import { StatusBadge } from "@/features/exchange/components/StatusBadge";
import { useSession } from "@/features/exchange/context/SessionContext";
import { formatDate, formatInr, formatSol, truncateAddress } from "@/features/exchange/lib/format";
import type { PaymentRecord, PaymentsResponse } from "@/features/exchange/types";

export function PaymentsScreen() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const { token, user } = useSession();
  const [state, setState] = useState<PaymentsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pendingPaymentKey, setPendingPaymentKey] = useState<string | null>(null);

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

    setPendingPaymentKey(`mock:${paymentId}`);
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
      setPendingPaymentKey(null);
    }
  }

  async function payWithPhantom(payment: PaymentRecord) {
    if (!token || !state?.solanaPaymentConfig.treasuryAddress) {
      return;
    }

    if (!payment.solanaQuote?.available || payment.solanaQuote.recipients.length === 0) {
      setError(payment.solanaQuote?.unavailableReason ?? "This payment is not ready for Phantom settlement.");
      setMessage(null);
      return;
    }

    if (!publicKey || !sendTransaction) {
      setError("Connect Phantom first before paying with localnet SOL.");
      setMessage(null);
      return;
    }

    if (!user?.externalWalletAddress) {
      setError("Bind this Phantom wallet on the KYC page before using localnet SOL payments.");
      setMessage(null);
      return;
    }

    if (user.externalWalletAddress !== publicKey.toBase58()) {
      setError("The connected Phantom wallet does not match the investor wallet bound to this profile.");
      setMessage(null);
      return;
    }

    setPendingPaymentKey(`sol:${payment.id}`);
    setError(null);
    setMessage("Preparing Phantom payment...");

    try {
      const latestBlockhash = await connection.getLatestBlockhash("confirmed");
      const transaction = new Transaction({
        feePayer: publicKey,
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
      }).add(
        ...payment.solanaQuote.recipients.map((recipient) =>
          SystemProgram.transfer({
            fromPubkey: publicKey,
            toPubkey: new PublicKey(recipient.address),
            lamports: recipient.amountLamports,
          }),
        ),
      );

      const signature = await sendTransaction(transaction, connection);
      await connection.confirmTransaction(
        {
          signature,
          blockhash: latestBlockhash.blockhash,
          lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
        },
        "confirmed",
      );

      await apiFetch(`/payments/${payment.id}/pay/solana`, {
        method: "POST",
        token,
        body: {
          signature,
          walletAddress: publicKey.toBase58(),
        },
      });

      setMessage("Phantom localnet SOL payment confirmed. The worker will settle the order shortly.");
      await load();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Failed to pay with Phantom.");
      setMessage(null);
    } finally {
      setPendingPaymentKey(null);
    }
  }

  const getSolanaDisabledReason = (payment: PaymentRecord) => {
    if (payment.status !== "pending") {
      return null;
    }

    if (!state?.solanaPaymentConfig.enabled) {
      return "Bind the same Phantom wallet on KYC before using localnet SOL.";
    }

    if (!payment.solanaQuote?.available) {
      return payment.solanaQuote?.unavailableReason ?? "This payment is not ready for Phantom settlement.";
    }

    return null;
  };

  return (
    <AuthGate allowedRoles={["investor"]}>
      <div className="space-y-6">
        <ScreenHeader
          eyebrow="Payments"
          title="Settle pending payments"
          description="INR stays as the source price, while localnet SOL can now be used as the payment rail before the worker settles the order into the program."
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
                  Available mock INR balance
                </p>
                <p className="mt-3 text-3xl font-semibold text-foreground">
                  {formatInr(state.cashBalanceInrMinor)}
                </p>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  Pending orders can be captured with mock INR or paid from Phantom on localnet.
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Demo quote: 1 SOL = {formatInr(state.solanaPaymentConfig.inrPerSolMinor)}
                  {state.solanaPaymentConfig.treasuryAddress
                    ? ` · Treasury ${truncateAddress(state.solanaPaymentConfig.treasuryAddress)}`
                    : ""}
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
                          {payment.solanaQuote ? (
                            <p className="mt-2 text-sm text-muted-foreground">
                              {formatSol(payment.solanaQuote.amountSol)}
                            </p>
                          ) : null}
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
                          <p className="mt-2 font-semibold text-foreground">
                            {payment.method === "solana_localnet" ? "Phantom localnet SOL" : "Mock UPI"}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-3">
                        <Button
                          onClick={() => void payWithPhantom(payment)}
                          disabled={pendingPaymentKey !== null || payment.status !== "pending" || Boolean(getSolanaDisabledReason(payment))}
                        >
                          {pendingPaymentKey === `sol:${payment.id}`
                            ? "Waiting for Phantom..."
                            : payment.status === "pending"
                              ? "Pay from Phantom"
                              : payment.method === "solana_localnet"
                                ? "Paid with Phantom"
                                : "Phantom unavailable"}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => void markPaid(payment.id)}
                          disabled={pendingPaymentKey !== null || payment.status !== "pending"}
                        >
                          {pendingPaymentKey === `mock:${payment.id}`
                            ? "Capturing..."
                            : payment.status === "pending"
                              ? "Capture mock payment"
                              : "Payment captured"}
                        </Button>
                      </div>

                      {payment.solanaQuote?.recipients.length ? (
                        <div className="rounded-[1.2rem] border border-white/70 bg-white/80 p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                            Localnet settlement
                          </p>
                          <div className="mt-3 space-y-3">
                            {payment.solanaQuote.recipients.map((recipient) => (
                              <div
                                key={`${payment.id}:${recipient.role}:${recipient.address}`}
                                className="flex flex-col gap-1 rounded-[1rem] border border-slate-200/70 bg-slate-50/80 px-3 py-3 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between"
                              >
                                <div>
                                  <p className="font-semibold text-foreground">{recipient.label}</p>
                                  <p>{truncateAddress(recipient.address)}</p>
                                </div>
                                <div className="text-foreground">
                                  {formatSol(recipient.amountSol)} · {formatInr(recipient.amountInrMinor)}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      {getSolanaDisabledReason(payment) ? (
                        <p className="text-sm text-muted-foreground">{getSolanaDisabledReason(payment)}</p>
                      ) : null}

                      {payment.paymentSignature ? (
                        <p className="text-sm text-muted-foreground">
                          Wallet signature {truncateAddress(payment.paymentSignature, 6)}
                        </p>
                      ) : null}
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

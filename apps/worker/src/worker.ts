import type { LocalState, QueueJob } from "../../api/src/domain";
import { settlePrimaryOrderOnChain, settleSecondaryOrderOnChain } from "../../api/src/chain";
import { addNotification, ensureStateFile, getPropertyById, readState, writeState } from "../../api/src/state";

const POLL_MS = Number(process.env.WORKER_POLL_MS ?? "1000");

const nowIso = () => new Date().toISOString();

const completeSettlement = (
  state: LocalState,
  job: QueueJob,
  signature: string,
  orderId: string,
  paymentId: string,
) => {
  const order = state.orders.find((value) => value.id === orderId);
  const payment = state.payments.find((value) => value.id === paymentId);
  if (!order || !payment) {
    throw new Error("Settlement result references missing order or payment.");
  }

  order.status = "settled";
  order.settledAt = nowIso();
  payment.status = "settled";
  payment.settledAt = nowIso();
  job.status = "completed";
  job.completedAt = nowIso();
  job.lastError = null;
  job.transactionSignature = signature;
};

const processPrimaryOrder = async (state: LocalState, job: QueueJob) => {
  const orderId = String(job.payload.orderId ?? "");
  const paymentId = String(job.payload.paymentId ?? "");
  const order = state.orders.find((value) => value.id === orderId);
  const payment = state.payments.find((value) => value.id === paymentId);

  if (!order || !payment) {
    throw new Error("Primary order references missing records.");
  }

  if (order.status === "settled" && order.settlementSignature) {
    completeSettlement(state, job, order.settlementSignature, order.id, payment.id);
    return;
  }

  if (payment.status !== "paid") {
    throw new Error("Primary order payment is not yet marked as paid.");
  }

  const property = getPropertyById(state, order.propertyId);
  if (!property) {
    throw new Error("Primary order property not found.");
  }

  const issuer = state.users.find((value) => value.id === property.issuerId);
  if (!issuer) {
    throw new Error("Issuer not found.");
  }

  const { signature } = await settlePrimaryOrderOnChain(state, order);
  const issuerNet = order.grossAmountInrMinor - order.feeAmountInrMinor;
  if (payment.method === "mock_upi") {
    issuer.cashBalanceInrMinor += issuerNet;
    state.platformTreasuryInrMinor += order.feeAmountInrMinor;
  }

  addNotification(
    state,
    order.buyerId,
    "Primary units settled",
    `${order.units} units are now visible in your portfolio with localnet backing.`,
  );
  addNotification(
    state,
    issuer.id,
    "Primary subscription settled",
    `${order.units} new units have been allocated in ${property.name}.`,
  );

  completeSettlement(state, job, signature, order.id, payment.id);
};

const processSecondaryTrade = async (state: LocalState, job: QueueJob) => {
  const orderId = String(job.payload.orderId ?? "");
  const paymentId = String(job.payload.paymentId ?? "");
  const order = state.orders.find((value) => value.id === orderId);
  const payment = state.payments.find((value) => value.id === paymentId);

  if (!order || !payment || !order.listingId || !order.sellerId) {
    throw new Error("Secondary order references missing records.");
  }

  if (order.status === "settled" && order.settlementSignature) {
    completeSettlement(state, job, order.settlementSignature, order.id, payment.id);
    return;
  }

  if (payment.status !== "paid") {
    throw new Error("Secondary trade payment is not yet marked as paid.");
  }

  const seller = state.users.find((value) => value.id === order.sellerId);
  if (!seller) {
    throw new Error("Seller user not found.");
  }

  const property = getPropertyById(state, order.propertyId);
  const { signature, trade } = await settleSecondaryOrderOnChain(state, order);
  if (payment.method === "mock_upi") {
    seller.cashBalanceInrMinor += order.grossAmountInrMinor - order.feeAmountInrMinor;
    state.platformTreasuryInrMinor += order.feeAmountInrMinor;
  }

  if (!state.trades.find((value) => value.onChainAddress === trade.onChainAddress)) {
    state.trades.unshift(trade);
  }

  if (property) {
    addNotification(
      state,
      order.buyerId,
      "Secondary trade settled",
      `${order.units} units of ${property.name} were transferred into your portfolio.`,
    );
    addNotification(
      state,
      order.sellerId,
      "Listing sold",
      `${order.units} units of ${property.name} were sold through the localnet market.`,
    );
  }

  completeSettlement(state, job, signature, order.id, payment.id);
};

const processQueuedJobs = async () => {
  const state = readState();
  const job = state.jobs.find(
    (value) => value.status === "queued" && Date.parse(value.availableAt) <= Date.now(),
  );

  if (!job) {
    return;
  }

  if (String(job.payload.orderId ?? "") === "noop") {
    job.status = "completed";
    job.completedAt = nowIso();
    writeState(state);
    return;
  }

  job.status = "processing";
  job.attempts += 1;
  writeState(state);

  try {
    if (job.type === "settle_primary_order") {
      await processPrimaryOrder(state, job);
    } else {
      await processSecondaryTrade(state, job);
    }
  } catch (error) {
    job.status = "failed";
    job.lastError = error instanceof Error ? error.message : "Unknown worker error";
  }

  writeState(state);
};

ensureStateFile();

console.log("Eternal local worker started.");
setInterval(() => {
  void processQueuedJobs();
}, POLL_MS);

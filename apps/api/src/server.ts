import type {
  AssetClass,
  KycRecord,
  Listing,
  LocalState,
  Order,
  PaymentIntent,
  PropertyProject,
  PublicUser,
  QueueJob,
  VerificationRequest,
} from "./domain";
import { PublicKey } from "@solana/web3.js";
import {
  addNotification,
  createRegisteredInvestor,
  ensureStateFile,
  enqueueJob,
  getAvailableUnitsForListing,
  getHolding,
  getPropertyDocumentAbsolutePath,
  getVerificationAttachmentAbsolutePath,
  getPropertyById,
  getPropertyDocuments,
  getUserByToken,
  listDemoUsers,
  mutateState,
  readState,
  resetState,
  toPublicUser,
  writePropertyDocumentFile,
  writeVerificationAttachmentFile,
  writeState,
} from "./state";
import { createListingOnChain, getPlatformTreasuryAddress, syncStateToChain } from "./chain";
import { minimumPrimaryUnits } from "./investment";
import {
  buildSolQuote,
  SOLANA_QUOTE_SOURCE,
  SOL_PRICE_INR_MINOR,
  verifyLocalnetSolTransfers,
} from "./solana-rail";
import {
  approveVerificationRequest,
  approveVerificationRequestAsAdmin,
  canAccessVerificationAttachment,
  findVerificationAttachment,
  formatVerificationRequest,
  inferVerificationMimeType,
  listAdminVerificationRequests,
  listIssuerVerificationRequests,
  listOwnerVerificationRequests,
  normalizeVerificationText,
  rejectVerificationRequest,
  rejectVerificationRequestAsAdmin,
  requireVerificationText,
  validateVerificationFiles,
  VerificationError,
} from "./verification";
import { Resend } from "resend";

const API_PORT = Number(process.env.PORT ?? "4000");
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;
const resend = new Resend(process.env.RESEND_API_KEY || "re_dummy");
const RESEND_FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL ?? "Eternal <onboarding@updates.jagjeevan.me>";
const LOCAL_EMAIL_DOMAIN = "@eternal.local";

type JsonValue = Record<string, unknown> | unknown[] | string | number | boolean | null;

const json = (status: number, body: JsonValue, headers?: Record<string, string>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET, POST, OPTIONS",
      "access-control-allow-headers": "content-type, authorization",
      ...headers,
    },
  });

const noContent = () =>
  new Response(null, {
    status: 204,
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET, POST, OPTIONS",
      "access-control-allow-headers": "content-type, authorization",
    },
  });

const headerSafeFileName = (value: string) =>
  value
    .normalize("NFKD")
    .replace(/[^\x20-\x7E]+/g, " ")
    .replace(/["\\]/g, "")
    .replace(/\s+/g, " ")
    .trim() || "document";

const fileResponse = (
  file: Blob,
  {
    fileName,
    mimeType,
  }: {
    fileName: string;
    mimeType: string;
  },
) =>
  new Response(file, {
    status: 200,
    headers: {
      "content-type": mimeType,
      "content-disposition": `inline; filename="${headerSafeFileName(fileName)}"`,
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET, POST, OPTIONS",
      "access-control-allow-headers": "content-type, authorization",
    },
  });

const parseJson = async <T>(request: Request) => {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
};

const readRequiredFormField = (
  formData: FormData,
  key: string,
  fieldLabel: string,
  maxLength: number,
) =>
  requireVerificationText(
    typeof formData.get(key) === "string" ? String(formData.get(key)) : null,
    fieldLabel,
    maxLength,
  );

const readIntegerFormField = (
  formData: FormData,
  key: string,
  fieldLabel: string,
  { min = 1, allowZero = false }: { min?: number; allowZero?: boolean } = {},
) => {
  const rawValue = readRequiredFormField(formData, key, fieldLabel, 32);
  const parsedValue = Number(rawValue);

  if (!Number.isFinite(parsedValue) || !Number.isInteger(parsedValue)) {
    throw new VerificationError(`${fieldLabel} must be a whole number.`, 400);
  }

  if (allowZero ? parsedValue < min : parsedValue <= min - 1) {
    const threshold = allowZero ? min : Math.max(min - 1, 0);
    throw new VerificationError(
      `${fieldLabel} must be ${threshold === 0 && allowZero ? "zero or greater" : `at least ${min}`}.`,
      400,
    );
  }

  return parsedValue;
};

const normalizeIdentifier = (value: string) => {
  const trimmed = value.trim();
  return trimmed.includes("@") ? trimmed.toLowerCase() : trimmed;
};

const isEmailIdentifier = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const isLocalDemoEmail = (value: string) => value.endsWith(LOCAL_EMAIL_DOMAIN);

const getAccountByIdentifier = (state: LocalState, identifier: string) =>
  state.users.find(
    (value) => value.email.toLowerCase() === identifier || value.phone === identifier,
  );

const assetClassLabel = (assetClass: AssetClass) =>
  assetClass === "company_share" ? "Company shares" : "Real estate";

const marketSegmentLabel = (assetClass: AssetClass) =>
  assetClass === "company_share" ? "Sector" : "Micro market";

const registrationLabel = (assetClass: AssetClass) =>
  assetClass === "company_share" ? "CIN / issue reference" : "Registry / RERA";

const structureLabel = (assetClass: AssetClass) =>
  assetClass === "company_share" ? "Issuer vehicle" : "SPV";

const formatProperty = (state: LocalState, property: PropertyProject) => {
  const issuer = state.users.find((value) => value.id === property.issuerId);
  const activeListings = state.listings.filter(
    (value) =>
      value.propertyId === property.id &&
      (value.status === "active" || value.status === "partially_filled"),
  );

  return {
    ...property,
    issuerName: issuer?.fullName ?? "Unknown issuer",
    assetClassLabel: assetClassLabel(property.assetClass),
    marketSegmentLabel: marketSegmentLabel(property.assetClass),
    registrationLabel: registrationLabel(property.assetClass),
    structureLabel: structureLabel(property.assetClass),
    fundedPercent:
      property.totalUnits === 0
        ? 0
        : Math.round((property.fundedUnits / property.totalUnits) * 100),
    activeListingCount: activeListings.length,
    activeListingUnits: activeListings.reduce((sum, value) => sum + value.unitsRemaining, 0),
    documentCount: getPropertyDocuments(state, property.id).filter((value) => value.status === "approved")
      .length,
  };
};

const formatIssuerOption = (user: LocalState["users"][number]) => ({
  id: user.id,
  fullName: user.fullName,
  email: user.email,
  city: user.city,
});

const requireAuth = (request: Request) => {
  const state = readState();
  const header = request.headers.get("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
  const actor = getUserByToken(state, token);

  if (!actor) {
    return {
      error: json(401, { error: "Unauthorized" }),
      state,
      actor: null,
    };
  }

  return {
    error: null,
    state,
    actor,
  };
};

const requireRole = (user: PublicUser, roles: PublicUser["role"][]) =>
  roles.includes(user.role);

const createSessionToken = () => `eternal_${crypto.randomUUID().replace(/-/g, "")}`;

const createPayment = (order: Order): PaymentIntent => ({
  id: `payment_${crypto.randomUUID().slice(0, 8)}`,
  orderId: order.id,
  userId: order.buyerId,
  amountInrMinor: order.grossAmountInrMinor,
  method: "mock_upi",
  status: "pending",
  reference: `UPI-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
  createdAt: new Date().toISOString(),
  settledAt: null,
  paymentSignature: null,
  paymentWalletAddress: null,
  paymentLamports: null,
  pricingSnapshotInrPerSolMinor: null,
});

type SolanaQuoteRecipientRole = "issuer" | "seller" | "platform_fee";

interface SolanaQuoteRecipient {
  role: SolanaQuoteRecipientRole;
  label: string;
  address: string;
  amountInrMinor: number;
  amountLamports: number;
  amountSol: number;
}

interface SolanaPaymentQuote {
  amountInrMinor: number;
  amountLamports: number;
  amountSol: number;
  inrPerSolMinor: number;
  source: typeof SOLANA_QUOTE_SOURCE;
  available: boolean;
  unavailableReason: string | null;
  recipients: SolanaQuoteRecipient[];
}

const isValidSolanaAddress = (value: string | null | undefined) => {
  if (!value) {
    return false;
  }

  try {
    new PublicKey(value);
    return true;
  } catch {
    return false;
  }
};

const buildSolanaPaymentQuote = (
  state: LocalState,
  payment: PaymentIntent,
  treasuryAddress: string | null,
): SolanaPaymentQuote => {
  const order = state.orders.find((value) => value.id === payment.orderId);
  const grossQuote = buildSolQuote(payment.amountInrMinor);

  if (!order) {
    return {
      ...grossQuote,
      available: false,
      unavailableReason: "Order context is missing for this payment intent.",
      recipients: [],
    };
  }

  if (!treasuryAddress || !isValidSolanaAddress(treasuryAddress)) {
    return {
      ...grossQuote,
      available: false,
      unavailableReason: "Platform treasury is not ready for localnet SOL settlement.",
      recipients: [],
    };
  }

  const feeInrMinor = Math.max(0, order.feeAmountInrMinor);
  const feeLamports = Math.min(grossQuote.amountLamports, buildSolQuote(feeInrMinor).amountLamports);
  const netInrMinor = Math.max(0, payment.amountInrMinor - feeInrMinor);
  const netLamports = Math.max(0, grossQuote.amountLamports - feeLamports);

  let recipientWallet: string | null = null;
  let unavailableReason: string | null = null;
  let recipientRole: SolanaQuoteRecipientRole = "issuer";
  let recipientLabel = "Issuer settlement";

  if (order.kind === "primary") {
    const property = state.properties.find((value) => value.id === order.propertyId);
    const issuer = property
      ? state.users.find((value) => value.id === property.issuerId && value.role === "issuer")
      : null;
    recipientWallet = issuer?.externalWalletAddress ?? issuer?.managedWalletAddress ?? null;
    recipientRole = "issuer";
    recipientLabel = "Issuer settlement";

    if (!recipientWallet) {
      unavailableReason = "Issuer settlement wallet is not available yet.";
    }
  } else {
    const seller = order.sellerId
      ? state.users.find((value) => value.id === order.sellerId && value.role === "investor")
      : null;
    recipientWallet = seller?.externalWalletAddress ?? null;
    recipientRole = "seller";
    recipientLabel = "Seller proceeds";

    if (!recipientWallet) {
      unavailableReason = "Seller has not bound a wallet for localnet SOL payouts yet.";
    }
  }

  if (recipientWallet && !isValidSolanaAddress(recipientWallet)) {
    unavailableReason = "Settlement wallet is not a valid Solana address.";
  }

  if (unavailableReason) {
    return {
      ...grossQuote,
      available: false,
      unavailableReason,
      recipients: [],
    };
  }

  const recipients: SolanaQuoteRecipient[] = [];

  if (recipientWallet && netLamports > 0) {
    recipients.push({
      role: recipientRole,
      label: recipientLabel,
      address: recipientWallet,
      amountInrMinor: netInrMinor,
      amountLamports: netLamports,
      amountSol: netLamports / 1_000_000_000,
    });
  }

  if (feeLamports > 0) {
    recipients.push({
      role: "platform_fee",
      label: "Platform fee",
      address: treasuryAddress,
      amountInrMinor: feeInrMinor,
      amountLamports: feeLamports,
      amountSol: feeLamports / 1_000_000_000,
    });
  }

  return {
    ...grossQuote,
    available: recipients.length > 0,
    unavailableReason: recipients.length > 0 ? null : "This payment does not have any localnet recipients.",
    recipients,
  };
};

const capturePaymentAndQueueSettlement = (
  state: LocalState,
  {
    paymentId,
    userId,
    method,
    paymentSignature = null,
    paymentWalletAddress = null,
    paymentLamports = null,
    pricingSnapshotInrPerSolMinor = null,
  }: {
    paymentId: string;
    userId: string;
    method: PaymentIntent["method"];
    paymentSignature?: string | null;
    paymentWalletAddress?: string | null;
    paymentLamports?: number | null;
    pricingSnapshotInrPerSolMinor?: number | null;
  },
) => {
  const payment = state.payments.find((value) => value.id === paymentId && value.userId === userId);
  if (!payment) {
    return { error: "Payment not found." } as const;
  }

  if (payment.status !== "pending") {
    return { error: "Only pending payments can be marked as paid." } as const;
  }

  const order = state.orders.find((value) => value.id === payment.orderId);
  if (!order) {
    return { error: "Payment is missing its order context." } as const;
  }

  const currentUser = state.users.find((value) => value.id === userId);
  if (!currentUser) {
    return { error: "User not found." } as const;
  }

  if (method === "mock_upi" && currentUser.cashBalanceInrMinor < payment.amountInrMinor) {
    return { error: "Insufficient mock INR balance." } as const;
  }

  if (method === "mock_upi") {
    currentUser.cashBalanceInrMinor -= payment.amountInrMinor;
  }

  payment.method = method;
  payment.status = "paid";
  payment.paymentSignature = paymentSignature;
  payment.paymentWalletAddress = paymentWalletAddress;
  payment.paymentLamports = paymentLamports;
  payment.pricingSnapshotInrPerSolMinor = pricingSnapshotInrPerSolMinor;
  order.status = "settlement_pending";

  enqueueJob(
    state,
    order.kind === "primary" ? "settle_primary_order" : "settle_secondary_trade",
    { orderId: order.id, paymentId: payment.id },
    1500,
  );

  addNotification(
    state,
    currentUser.id,
    method === "solana_localnet" ? "Localnet SOL payment captured" : "Payment captured",
    method === "solana_localnet"
      ? `Wallet payment ${payment.reference} is confirmed on localnet and waiting for settlement.`
      : `Payment ${payment.reference} is captured and waiting for local settlement.`,
  );

  return { payment, order } as const;
};

const createPrimaryOrder = (
  property: PropertyProject,
  buyerId: string,
  units: number,
  feeBps: number,
): Order => {
  const grossAmountInrMinor = units * property.unitPriceInrMinor;
  const feeAmountInrMinor = Math.round((grossAmountInrMinor * feeBps) / 10000);

  return {
    id: `order_${crypto.randomUUID().slice(0, 8)}`,
    kind: "primary",
    propertyId: property.id,
    buyerId,
    sellerId: null,
    listingId: null,
    units,
    pricePerUnitInrMinor: property.unitPriceInrMinor,
    grossAmountInrMinor,
    feeAmountInrMinor,
    status: "awaiting_payment",
    paymentId: "",
    createdAt: new Date().toISOString(),
    settledAt: null,
    settlementSignature: null,
    onChainTradeAddress: null,
  };
};

const createSecondaryOrder = (
  listing: Listing,
  buyerId: string,
  units: number,
  feeBps: number,
): Order => {
  const grossAmountInrMinor = units * listing.pricePerUnitInrMinor;
  const feeAmountInrMinor = Math.round((grossAmountInrMinor * feeBps) / 10000);

  return {
    id: `order_${crypto.randomUUID().slice(0, 8)}`,
    kind: "secondary",
    propertyId: listing.propertyId,
    buyerId,
    sellerId: listing.sellerId,
    listingId: listing.id,
    units,
    pricePerUnitInrMinor: listing.pricePerUnitInrMinor,
    grossAmountInrMinor,
    feeAmountInrMinor,
    status: "awaiting_payment",
    paymentId: "",
    createdAt: new Date().toISOString(),
    settledAt: null,
    settlementSignature: null,
    onChainTradeAddress: null,
  };
};

const kycSummary = (record: KycRecord | undefined) =>
  record
    ? {
        ...record,
      }
    : null;

const dashboardSummary = (state: LocalState, userId: string) => {
  const currentUser = state.users.find((value) => value.id === userId);
  if (!currentUser) {
    return null;
  }

  const orders = state.orders.filter((value) => value.buyerId === userId || value.sellerId === userId);
  const holdings = state.holdings.filter((value) => value.userId === userId);
  const notifications = state.notifications.filter((value) => value.userId === userId).slice(0, 5);
  const activeListings = state.listings.filter(
    (value) =>
      value.sellerId === userId &&
      (value.status === "active" || value.status === "partially_filled"),
  );

  return {
    user: toPublicUser(currentUser),
    stats: {
      activeOrders: orders.filter(
        (value) => value.status === "awaiting_payment" || value.status === "settlement_pending",
      ).length,
      settledOrders: orders.filter((value) => value.status === "settled").length,
      holdings: holdings.length,
      activeListings: activeListings.length,
      cashBalanceInrMinor: currentUser.cashBalanceInrMinor,
    },
    nextSteps: [
      currentUser.kycStatus === "approved"
        ? "Browse live assets and complete a mock UPI payment to settle locally."
        : "Complete KYC first to unlock investing and secondary market access.",
      currentUser.externalWalletAddress
        ? "Wallet is already bound. You can keep using app-led flows."
        : "Optionally connect and bind a Solana wallet for future settlement visibility.",
      currentUser.role === "issuer"
        ? "Submit your next real-estate or company-share issue from the issuer workspace."
        : currentUser.role === "admin"
          ? "Work through the KYC and asset approval queues."
          : "Track active listings and quarterly distributions from your portfolio.",
    ],
    featuredProperties: state.properties
      .filter((value) => value.status === "live")
      .slice(0, 2)
      .map((value) => formatProperty(state, value)),
    notifications,
  };
};

const syncChainReadModel = async (state: LocalState) => {
  await syncStateToChain(state);
  writeState(state);
  return state;
};

const syncChainReadModelSafely = async (state: LocalState) => {
  try {
    return await syncChainReadModel(state);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`Chain read-model sync failed. Using local snapshot. ${message}`);
    writeState(state);
    return state;
  }
};

ensureStateFile();

const server = Bun.serve({
  port: API_PORT,
  async fetch(request) {
    const url = new URL(request.url);
    const { pathname } = url;

    if (request.method === "OPTIONS") {
      return noContent();
    }

    if (pathname === "/health" && request.method === "GET") {
      return json(200, { ok: true, mode: "local-product-stack" });
    }

    if (pathname === "/seed-users" && request.method === "GET") {
      return json(200, { demoUsers: listDemoUsers(readState()) });
    }

    if (pathname === "/reset" && request.method === "POST") {
      resetState();
      return json(200, { ok: true });
    }

    if (pathname === "/auth/signup" && request.method === "POST") {
      const body = await parseJson<{ email?: string; fullName?: string }>(request);
      const email = normalizeIdentifier(body?.email ?? "");
      const fullName = body?.fullName?.trim() ?? "";

      if (!email || !fullName) {
        return json(400, { error: "Full name and email are required." });
      }

      if (!isEmailIdentifier(email)) {
        return json(400, { error: "Enter a valid email address." });
      }

      if (isLocalDemoEmail(email)) {
        return json(400, {
          error: "Seeded @eternal.local accounts do not need signup. Use OTP 000000 to log in.",
        });
      }

      const state = readState();
      const existingAccount = getAccountByIdentifier(state, email);
      const created = !existingAccount;
      const account = existingAccount ?? createRegisteredInvestor(state, fullName, email);

      if (!existingAccount) {
        writeState(state);
      }

      return json(created ? 201 : 200, {
        created,
        user: toPublicUser(account),
      });
    }

    if (pathname === "/auth/otp" && request.method === "POST") {
      const body = await parseJson<{ identifier?: string }>(request);
      const identifier = normalizeIdentifier(body?.identifier ?? "");

      if (!identifier) {
        return json(400, { error: "Identifier is required." });
      }

      const state = readState();
      const account = getAccountByIdentifier(state, identifier);

      if (!account) {
        return json(404, {
          error: isEmailIdentifier(identifier)
            ? "Account not found. Sign up first, or use a seeded @eternal.local account."
            : "No seeded demo account matches that identifier.",
        });
      }

      const isDummyAccount = isLocalDemoEmail(account.email.toLowerCase());

      if (isDummyAccount) {
        return json(200, {
          challengeId: `otp_${account.id}`,
          destination: identifier,
          codeHint: "Use 000000 for seeded @eternal.local accounts.",
          deliveryMode: "local",
        });
      }

      if (!process.env.RESEND_API_KEY) {
        return json(503, { error: "RESEND_API_KEY is not configured." });
      }

      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      account.otpCode = otpCode;
      writeState(state);

      try {
        await resend.emails.send({
          from: RESEND_FROM_EMAIL,
          to: [account.email],
          subject: "Your Eternal Login Code",
          html: `<p>Your login code is <strong>${otpCode}</strong></p>`,
        });

        return json(200, {
          challengeId: `otp_${account.id}`,
          destination: account.email,
          codeHint: "We sent a 6-digit code to your email.",
          deliveryMode: "email",
        });
      } catch (error) {
        console.error("Resend error:", error);
        return json(500, {
          error: "Failed to send OTP email. Check your Resend API key and verified sender email.",
        });
      }
    }

    if (pathname === "/auth/verify" && request.method === "POST") {
      const body = await parseJson<{ identifier?: string; code?: string }>(request);
      const identifier = normalizeIdentifier(body?.identifier ?? "");
      const code = body?.code?.trim() ?? "";

      if (!identifier || !code) {
        return json(400, { error: "Identifier and code are required." });
      }

      const state = readState();
      const account = getAccountByIdentifier(state, identifier);

      if (!account) {
        return json(404, { error: "Account not found." });
      }

      const isDummyAccount = isLocalDemoEmail(account.email.toLowerCase());

      if (isDummyAccount) {
        if (code !== "000000") {
          return json(400, { error: "Local mode accepts only 000000." });
        }
      } else {
        if (code !== account.otpCode) {
          return json(400, { error: "Invalid or expired OTP code." });
        }

        account.otpCode = undefined;
      }

      const session = {
        token: createSessionToken(),
        userId: account.id,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + SESSION_TTL_MS).toISOString(),
      };

      state.sessions = state.sessions.filter((value) => value.userId !== account.id);
      state.sessions.push(session);
      writeState(state);

      return json(200, {
        token: session.token,
        user: toPublicUser(account),
      });
    }

    if (pathname === "/auth/logout" && request.method === "POST") {
      const auth = requireAuth(request);
      if (auth.error || !auth.actor) {
        return auth.error!;
      }

      auth.state.sessions = auth.state.sessions.filter(
        (value) => value.token !== auth.actor?.session.token,
      );
      writeState(auth.state);
      return json(200, { ok: true });
    }

    if (pathname === "/session" && request.method === "GET") {
      const auth = requireAuth(request);
      if (auth.error || !auth.actor) {
        return auth.error!;
      }

      return json(200, { user: toPublicUser(auth.actor.user) });
    }

    if ((pathname === "/properties" || pathname === "/assets") && request.method === "GET") {
      const state = await syncChainReadModelSafely(readState());
      return json(200, {
        properties: state.properties
          .filter((value) => value.status === "live")
          .map((value) => formatProperty(state, value)),
      });
    }

    if (
      (pathname.startsWith("/properties/") || pathname.startsWith("/assets/")) &&
      request.method === "GET"
    ) {
      const slug = pathname.startsWith("/assets/")
        ? pathname.replace("/assets/", "")
        : pathname.replace("/properties/", "");
      const state = await syncChainReadModelSafely(readState());
      const property = state.properties.find((value) => value.slug === slug);
      if (!property) {
        return json(404, { error: "Asset not found." });
      }

      const listings = state.listings
        .filter(
          (value) =>
            value.propertyId === property.id &&
            (value.status === "active" || value.status === "partially_filled"),
        )
        .map((value) => {
          const seller = state.users.find((user) => user.id === value.sellerId);
          return {
            ...value,
            sellerName: seller?.fullName ?? "Unknown seller",
          };
        });

      const trades = state.trades
        .filter((value) => value.propertyId === property.id)
        .slice(-5)
        .reverse()
        .map((value) => {
          const buyer = state.users.find((user) => user.id === value.buyerId);
          const seller = state.users.find((user) => user.id === value.sellerId);

          return {
            ...value,
            buyerName: buyer?.fullName ?? "Unknown buyer",
            sellerName: seller?.fullName ?? "Unknown seller",
          };
        });

      return json(200, {
        property: formatProperty(state, property),
        documents: getPropertyDocuments(state, property.id).filter((value) => value.status === "approved"),
        listings,
        trades,
      });
    }

    if (pathname === "/kyc" && request.method === "GET") {
      const auth = requireAuth(request);
      if (auth.error || !auth.actor) {
        return auth.error!;
      }

      const record = auth.state.kycRecords.find((value) => value.userId === auth.actor?.user.id);

      return json(200, { record: kycSummary(record) });
    }

    if (pathname === "/kyc/submit" && request.method === "POST") {
      const auth = requireAuth(request);
      if (auth.error || !auth.actor) {
        return auth.error!;
      }

      const body = await parseJson<{
        panMasked?: string;
        aadhaarMasked?: string;
        occupation?: string;
        annualIncomeBand?: string;
      }>(request);

      if (!body?.panMasked || !body.aadhaarMasked || !body.occupation || !body.annualIncomeBand) {
        return json(400, { error: "All KYC fields are required." });
      }

      const result = mutateState((state) => {
        let record = state.kycRecords.find((value) => value.userId === auth.actor?.user.id);
        if (!record) {
          record = {
            id: `kyc_${crypto.randomUUID().slice(0, 8)}`,
            userId: auth.actor!.user.id,
            status: "pending",
            panMasked: body.panMasked!,
            aadhaarMasked: body.aadhaarMasked!,
            occupation: body.occupation!,
            annualIncomeBand: body.annualIncomeBand!,
            notes: "Submitted from local product flow.",
            submittedAt: new Date().toISOString(),
            reviewedAt: null,
            reviewerId: null,
          };
          state.kycRecords.push(record);
        } else {
          record.status = "pending";
          record.panMasked = body.panMasked!;
          record.aadhaarMasked = body.aadhaarMasked!;
          record.occupation = body.occupation!;
          record.annualIncomeBand = body.annualIncomeBand!;
          record.notes = "Resubmitted from local product flow.";
          record.submittedAt = new Date().toISOString();
          record.reviewedAt = null;
          record.reviewerId = null;
        }

        const currentUser = state.users.find((value) => value.id === auth.actor?.user.id)!;
        currentUser.kycStatus = "pending";
        addNotification(
          state,
          "user_admin",
          "KYC pending review",
          `${currentUser.fullName} submitted KYC for compliance review.`,
        );

        return record;
      });

      return json(200, { record: result });
    }

    if (pathname === "/wallets/bind" && request.method === "POST") {
      const auth = requireAuth(request);
      if (auth.error || !auth.actor) {
        return auth.error!;
      }

      const body = await parseJson<{ address?: string }>(request);
      if (!body?.address) {
        return json(400, { error: "Wallet address is required." });
      }

      let normalizedAddress: string;
      try {
        normalizedAddress = new PublicKey(body.address.trim()).toBase58();
      } catch {
        return json(400, { error: "Enter a valid Solana wallet address." });
      }

      const state = auth.state;
      const currentUser = state.users.find((value) => value.id === auth.actor?.user.id)!;
      currentUser.externalWalletAddress = normalizedAddress;
      addNotification(
        state,
        currentUser.id,
        "Wallet linked",
        "Your external Solana wallet is now bound to the local product account.",
      );

      await syncChainReadModel(state);
      return json(200, { user: toPublicUser(currentUser) });
    }

    if (pathname === "/dashboard" && request.method === "GET") {
      const auth = requireAuth(request);
      if (auth.error || !auth.actor) {
        return auth.error!;
      }

      const state = await syncChainReadModelSafely(auth.state);
      const summary = dashboardSummary(state, auth.actor.user.id);
      return json(200, summary ?? { error: "Dashboard unavailable." });
    }

    if (pathname === "/portfolio" && request.method === "GET") {
      const auth = requireAuth(request);
      if (auth.error || !auth.actor) {
        return auth.error!;
      }

      const state = await syncChainReadModelSafely(auth.state);

      const holdings = state.holdings
        .filter((value) => value.userId === auth.actor?.user.id && value.units > 0)
        .map((value) => {
          const property = getPropertyById(state, value.propertyId)!;
          const activeListings = state.listings.filter(
            (listing) =>
              listing.propertyId === value.propertyId &&
              listing.sellerId === auth.actor?.user.id &&
              (listing.status === "active" || listing.status === "partially_filled"),
          );
          return {
            ...value,
            property: formatProperty(state, property),
            marketValueInrMinor: value.units * property.unitPriceInrMinor,
            listedUnits: activeListings.reduce((sum, listing) => sum + listing.unitsRemaining, 0),
          };
        });

      const listings = state.listings
        .filter((value) => value.sellerId === auth.actor?.user.id)
        .map((value) => ({
          ...value,
          property: formatProperty(state, getPropertyById(state, value.propertyId)!),
        }));

      const distributions = state.distributions
        .filter((value) => value.userId === auth.actor?.user.id)
        .map((value) => ({
          ...value,
          property: formatProperty(state, getPropertyById(state, value.propertyId)!),
        }));

      return json(200, { holdings, listings, distributions });
    }

    if (pathname === "/orders" && request.method === "GET") {
      const auth = requireAuth(request);
      if (auth.error || !auth.actor) {
        return auth.error!;
      }

      const orders = auth.state.orders
        .filter((value) => value.buyerId === auth.actor?.user.id || value.sellerId === auth.actor?.user.id)
        .map((value) => ({
          ...value,
          property: formatProperty(auth.state, getPropertyById(auth.state, value.propertyId)!),
          payment: auth.state.payments.find((payment) => payment.id === value.paymentId) ?? null,
        }))
        .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));

      return json(200, { orders });
    }

    if (pathname === "/payments" && request.method === "GET") {
      const auth = requireAuth(request);
      if (auth.error || !auth.actor) {
        return auth.error!;
      }

      const treasuryAddress = await getPlatformTreasuryAddress(auth.state).catch(() => null);

      const payments = auth.state.payments
        .filter((value) => value.userId === auth.actor?.user.id)
        .map((value) => {
          const order = auth.state.orders.find((record) => record.id === value.orderId)!;
          return {
            ...value,
            order,
            property: formatProperty(auth.state, getPropertyById(auth.state, order.propertyId)!),
            solanaQuote: buildSolanaPaymentQuote(auth.state, value, treasuryAddress),
          };
        })
        .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));

      return json(200, {
        cashBalanceInrMinor: auth.actor.user.cashBalanceInrMinor,
        payments,
        solanaPaymentConfig: {
          enabled: Boolean(auth.actor.user.externalWalletAddress && treasuryAddress),
          treasuryAddress,
          inrPerSolMinor: SOL_PRICE_INR_MINOR,
          source: SOLANA_QUOTE_SOURCE,
        },
      });
    }

    if (
      pathname.startsWith("/payments/") &&
      pathname.endsWith("/pay/solana") &&
      request.method === "POST"
    ) {
      const auth = requireAuth(request);
      if (auth.error || !auth.actor) {
        return auth.error!;
      }

      const paymentId = pathname.replace("/payments/", "").replace("/pay/solana", "");
      const body = await parseJson<{ signature?: string; walletAddress?: string }>(request);
      const signature = body?.signature?.trim() ?? "";
      const walletAddress = body?.walletAddress?.trim() ?? "";

      if (!signature || !walletAddress) {
        return json(400, { error: "Wallet address and payment signature are required." });
      }

      const currentUser = auth.state.users.find((value) => value.id === auth.actor.user.id)!;
      if (!currentUser.externalWalletAddress) {
        return json(400, { error: "Bind your Phantom wallet before using localnet SOL payments." });
      }

      if (currentUser.externalWalletAddress !== walletAddress) {
        return json(400, { error: "The connected wallet does not match the bound investor wallet." });
      }

      if (
        auth.state.payments.some(
          (value) => value.id !== paymentId && value.paymentSignature === signature,
        )
      ) {
        return json(400, { error: "This localnet transaction is already linked to another payment." });
      }

      const payment = auth.state.payments.find(
        (value) => value.id === paymentId && value.userId === auth.actor.user.id,
      );
      if (!payment) {
        return json(404, { error: "Payment not found." });
      }

      const treasuryAddress = await getPlatformTreasuryAddress(auth.state).catch(() => null);
      const solanaQuote = buildSolanaPaymentQuote(auth.state, payment, treasuryAddress);
      if (!solanaQuote.available) {
        return json(400, { error: solanaQuote.unavailableReason ?? "Localnet SOL payment is not ready for this order." });
      }

      try {
        await verifyLocalnetSolTransfers({
          signature,
          expectedSource: walletAddress,
          expectedTransfers: solanaQuote.recipients.map((recipient) => ({
            label: recipient.label,
            destination: recipient.address,
            minimumLamports: recipient.amountLamports,
          })),
        });
      } catch (error) {
        return json(400, {
          error:
            error instanceof Error
              ? error.message
              : "Failed to verify the localnet wallet payment.",
        });
      }

      const result = mutateState((state) =>
        capturePaymentAndQueueSettlement(state, {
          paymentId,
          userId: auth.actor!.user.id,
          method: "solana_localnet",
          paymentSignature: signature,
          paymentWalletAddress: walletAddress,
          paymentLamports: solanaQuote.amountLamports,
          pricingSnapshotInrPerSolMinor: solanaQuote.inrPerSolMinor,
        }),
      );

      if ("error" in result) {
        return json(400, result);
      }

      return json(200, result);
    }

    if (pathname.startsWith("/payments/") && pathname.endsWith("/pay") && request.method === "POST") {
      const auth = requireAuth(request);
      if (auth.error || !auth.actor) {
        return auth.error!;
      }

      const paymentId = pathname.replace("/payments/", "").replace("/pay", "");

      const result = mutateState((state) =>
        capturePaymentAndQueueSettlement(state, {
          paymentId,
          userId: auth.actor!.user.id,
          method: "mock_upi",
        }),
      );

      if ("error" in result) {
        return json(400, result);
      }

      return json(200, result);
    }

    if (pathname === "/orders/primary" && request.method === "POST") {
      const auth = requireAuth(request);
      if (auth.error || !auth.actor) {
        return auth.error!;
      }

      if (auth.actor.user.role !== "investor") {
        return json(403, { error: "Only investors can subscribe to offerings." });
      }

      if (auth.actor.user.kycStatus !== "approved") {
        return json(400, { error: "KYC approval is required before investing." });
      }

      const body = await parseJson<{ propertyId?: string; units?: number }>(request);
      if (!body?.propertyId || !body.units || body.units <= 0) {
        return json(400, { error: "Asset and units are required." });
      }

      const state = await syncChainReadModel(auth.state);
      const property = state.properties.find((value) => value.id === body.propertyId);
      if (!property || property.status !== "live") {
        return json(400, { error: "Asset is not open for investment." });
      }

      if (body.units > property.availableUnits) {
        return json(400, { error: "Units requested exceed current chain availability." });
      }

      const minimumOrderUnits = minimumPrimaryUnits(
        property.minimumInvestmentInrMinor,
        property.unitPriceInrMinor,
      );
      if (minimumOrderUnits > 0 && body.units < minimumOrderUnits) {
        return json(400, {
          error: `Minimum primary order size is ${minimumOrderUnits} units for this asset.`,
        });
      }

      const order = createPrimaryOrder(property, auth.actor.user.id, body.units, state.config.primaryFeeBps);
      const payment = createPayment(order);
      order.paymentId = payment.id;

      state.orders.unshift(order);
      state.payments.unshift(payment);

      addNotification(
        state,
        auth.actor.user.id,
        "Primary order created",
        `${body.units} units are reserved in the order book. Complete payment from the Payments route to settle them on localnet.`,
      );

      writeState(state);
      return json(201, { order, payment });
    }

    if (pathname === "/listings" && request.method === "POST") {
      const auth = requireAuth(request);
      if (auth.error || !auth.actor) {
        return auth.error!;
      }

      if (auth.actor.user.role !== "investor") {
        return json(403, { error: "Only investors can publish listings." });
      }

      if (auth.actor.user.kycStatus !== "approved") {
        return json(400, { error: "KYC approval is required before selling units." });
      }

      if (!auth.actor.user.externalWalletAddress) {
        return json(400, {
          error: "Bind your Phantom wallet before publishing a listing so buyer payments can settle to your wallet.",
        });
      }

      const body = await parseJson<{ propertyId?: string; units?: number; pricePerUnitInrMinor?: number }>(request);
      if (!body?.propertyId || !body.units || !body.pricePerUnitInrMinor) {
        return json(400, { error: "Property, units, and pricing are required." });
      }

      const state = await syncChainReadModel(auth.state);
      const property = state.properties.find((value) => value.id === body.propertyId);
      if (!property || property.status !== "live") {
        return json(400, { error: "Asset is not tradable." });
      }

      const availableUnits = getAvailableUnitsForListing(state, auth.actor.user.id, body.propertyId);
      if (body.units > availableUnits) {
        return json(400, { error: "Not enough unlocked units to create this listing." });
      }

      const listing: Listing = {
        id: `listing_${crypto.randomUUID().slice(0, 8)}`,
        propertyId: body.propertyId,
        sellerId: auth.actor.user.id,
        sequenceId: null,
        unitsListed: body.units,
        unitsRemaining: body.units,
        pricePerUnitInrMinor: body.pricePerUnitInrMinor,
        status: "active",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        onChainAddress: null,
        creationSignature: null,
        cancelSignature: null,
      };

      state.listings.unshift(listing);
      await createListingOnChain(state, listing);

      addNotification(
        state,
        auth.actor.user.id,
        "Listing published",
        `${body.units} units are now live on the localnet secondary board.`,
      );

      writeState(state);
      return json(201, { listing });
    }

    if (pathname.startsWith("/listings/") && pathname.endsWith("/buy") && request.method === "POST") {
      const auth = requireAuth(request);
      if (auth.error || !auth.actor) {
        return auth.error!;
      }

      if (auth.actor.user.role !== "investor") {
        return json(403, { error: "Only investors can buy secondary listings." });
      }

      if (auth.actor.user.kycStatus !== "approved") {
        return json(400, { error: "KYC approval is required before trading." });
      }

      const listingId = pathname.replace("/listings/", "").replace("/buy", "");
      const body = await parseJson<{ units?: number }>(request);
      if (!body?.units || body.units <= 0) {
        return json(400, { error: "Trade size is required." });
      }

      const state = await syncChainReadModel(auth.state);
      const listing = state.listings.find((value) => value.id === listingId);
      if (!listing || (listing.status !== "active" && listing.status !== "partially_filled")) {
        return json(400, { error: "Listing is not available." });
      }

      if (listing.sellerId === auth.actor.user.id) {
        return json(400, { error: "You cannot buy your own listing." });
      }

      if (body.units > listing.unitsRemaining) {
        return json(400, { error: "Requested units exceed the remaining listing size." });
      }

      const order = createSecondaryOrder(listing, auth.actor.user.id, body.units, state.config.secondaryFeeBps);
      const payment = createPayment(order);
      order.paymentId = payment.id;

      state.orders.unshift(order);
      state.payments.unshift(payment);

      addNotification(
        state,
        auth.actor.user.id,
        "Secondary trade created",
        `${body.units} units are now awaiting payment from the Payments route before localnet settlement.`,
      );

      writeState(state);
      return json(201, { order, payment });
    }

    if (pathname === "/verification/requests" && request.method === "GET") {
      const auth = requireAuth(request);
      if (auth.error || !auth.actor) {
        return auth.error!;
      }

      if (auth.actor.user.role !== "investor") {
        return json(403, { error: "Investor access required." });
      }

      console.info("[verification-api] owner list", {
        ownerUserId: auth.actor.user.id,
        requestCount: auth.state.verificationRequests.filter((value) => value.ownerUserId === auth.actor.user.id)
          .length,
      });

      return json(200, {
        requests: listOwnerVerificationRequests(auth.state, auth.actor.user.id),
        issuers: auth.state.users
          .filter((value) => value.role === "issuer")
          .map((value) => formatIssuerOption(value)),
      });
    }

    if (pathname === "/verification/requests" && request.method === "POST") {
      const auth = requireAuth(request);
      if (auth.error || !auth.actor) {
        return auth.error!;
      }

      if (auth.actor.user.role !== "investor") {
        return json(403, { error: "Investor access required." });
      }

      try {
        const formData = await request.formData();
        const issuerId = requireVerificationText(
          typeof formData.get("issuerId") === "string" ? String(formData.get("issuerId")) : null,
          "Issuer",
          120,
        );
        const assetName = requireVerificationText(
          typeof formData.get("assetName") === "string" ? String(formData.get("assetName")) : null,
          "Asset name",
          120,
        );
        const assetCategory = normalizeVerificationText(
          typeof formData.get("assetCategory") === "string"
            ? String(formData.get("assetCategory"))
            : null,
          80,
        );
        const ownerNote = normalizeVerificationText(
          typeof formData.get("ownerNote") === "string" ? String(formData.get("ownerNote")) : null,
          600,
        );
        const attachments = formData
          .getAll("documents")
          .filter((value): value is File => value instanceof File);

        console.info("[verification-api] owner submit received", {
          ownerUserId: auth.actor.user.id,
          issuerId,
          assetName,
          assetCategory,
          ownerNoteLength: ownerNote?.length ?? 0,
          attachments: attachments.map((value) => ({
            name: value.name,
            type: value.type,
            size: value.size,
          })),
        });

        validateVerificationFiles(
          attachments.map((value) => ({
            name: value.name,
            type: value.type,
            size: value.size,
          })),
        );

        const issuer = auth.state.users.find((value) => value.id === issuerId && value.role === "issuer");
        if (!issuer) {
          return json(400, { error: "Select a valid issuer." });
        }

        const verificationRequest: VerificationRequest = {
          id: `verification_${crypto.randomUUID().slice(0, 8)}`,
          ownerUserId: auth.actor.user.id,
          issuerId,
          assetName,
          assetCategory,
          ownerNote,
          reviewerNote: null,
          status: "pending",
          submittedAt: new Date().toISOString(),
          reviewedAt: null,
          reviewerId: null,
          attachments: [],
        };

        for (const file of attachments) {
          const attachmentId = `verification_file_${crypto.randomUUID().slice(0, 8)}`;
          const mimeType = inferVerificationMimeType(file.name, file.type);
          const storagePath = writeVerificationAttachmentFile(
            verificationRequest.id,
            attachmentId,
            file.name,
            new Uint8Array(await file.arrayBuffer()),
          );

          verificationRequest.attachments.push({
            id: attachmentId,
            name: file.name,
            mimeType,
            sizeBytes: file.size,
            uploadedAt: new Date().toISOString(),
            storagePath,
          });
        }

        auth.state.verificationRequests.unshift(verificationRequest);
        writeState(auth.state);

        console.info("[verification-api] owner submit stored", {
          requestId: verificationRequest.id,
          ownerUserId: verificationRequest.ownerUserId,
          issuerId: verificationRequest.issuerId,
          attachmentCount: verificationRequest.attachments.length,
        });

        return json(201, {
          request: formatVerificationRequest(auth.state, verificationRequest),
        });
      } catch (error) {
        if (error instanceof VerificationError) {
          console.error("[verification-api] owner submit validation error", {
            ownerUserId: auth.actor.user.id,
            error: error.message,
            status: error.status,
          });
          return json(error.status, { error: error.message });
        }

        console.error("[verification-api] owner submit unexpected error", error);
        throw error;
      }
    }

    if (pathname.startsWith("/verification/files/") && request.method === "GET") {
      const auth = requireAuth(request);
      if (auth.error || !auth.actor) {
        return auth.error!;
      }

      const attachmentId = pathname.replace("/verification/files/", "");
      const match = findVerificationAttachment(auth.state, attachmentId);
      if (!match) {
        console.error("[verification-api] file lookup failed", {
          actorUserId: auth.actor.user.id,
          attachmentId,
        });
        return json(404, { error: "Verification document not found." });
      }

      if (
        !canAccessVerificationAttachment(
          match.request,
          auth.actor.user.id,
          auth.actor.user.role,
        )
      ) {
        console.error("[verification-api] file access denied", {
          actorUserId: auth.actor.user.id,
          attachmentId,
          requestId: match.request.id,
        });
        return json(403, { error: "You do not have access to this document." });
      }

      try {
        const absolutePath = getVerificationAttachmentAbsolutePath(match.attachment.storagePath);
        const file = Bun.file(absolutePath);
        if (!(await file.exists())) {
          console.error("[verification-api] file missing on disk", {
            actorUserId: auth.actor.user.id,
            attachmentId,
            requestId: match.request.id,
            storagePath: match.attachment.storagePath,
          });
          return json(404, { error: "Verification document file not found." });
        }

        console.info("[verification-api] file open success", {
          actorUserId: auth.actor.user.id,
          attachmentId,
          requestId: match.request.id,
          fileName: match.attachment.name,
        });

        return fileResponse(file, {
          fileName: match.attachment.name,
          mimeType: match.attachment.mimeType,
        });
      } catch (error) {
        console.error("[verification-api] file open unexpected error", {
          actorUserId: auth.actor.user.id,
          attachmentId,
          error,
        });
        return json(404, { error: "Verification document file not found." });
      }
    }

    if (pathname.startsWith("/property-documents/files/") && request.method === "GET") {
      const documentId = pathname.replace("/property-documents/files/", "");
      const state = readState();
      const document = state.propertyDocuments.find((value) => value.id === documentId);

      if (!document?.storagePath) {
        return json(404, { error: "Property document not found." });
      }

      try {
        const absolutePath = getPropertyDocumentAbsolutePath(document.storagePath);
        const file = Bun.file(absolutePath);
        if (!(await file.exists())) {
          return json(404, { error: "Property document file not found." });
        }

        return fileResponse(file, {
          fileName: document.name,
          mimeType: document.mimeType ?? "application/octet-stream",
        });
      } catch (error) {
        console.error("[property-document-api] file open unexpected error", {
          documentId,
          error,
        });
        return json(404, { error: "Property document file not found." });
      }
    }

    if (pathname === "/issuer/verification/requests" && request.method === "GET") {
      const auth = requireAuth(request);
      if (auth.error || !auth.actor) {
        return auth.error!;
      }

      if (auth.actor.user.role !== "issuer") {
        return json(403, { error: "Issuer access required." });
      }

      console.info("[verification-api] issuer list", {
        issuerUserId: auth.actor.user.id,
        requestCount: auth.state.verificationRequests.filter((value) => value.issuerId === auth.actor.user.id)
          .length,
      });

      return json(200, listIssuerVerificationRequests(auth.state, auth.actor.user.id));
    }

    if (
      pathname.startsWith("/issuer/verification/requests/") &&
      pathname.endsWith("/approve") &&
      request.method === "POST"
    ) {
      const auth = requireAuth(request);
      if (auth.error || !auth.actor) {
        return auth.error!;
      }

      if (auth.actor.user.role !== "issuer") {
        return json(403, { error: "Issuer access required." });
      }

      const requestId = pathname.replace("/issuer/verification/requests/", "").replace("/approve", "");
      const body = await parseJson<{ reviewerNote?: string }>(request);

      try {
        console.info("[verification-api] issuer approve received", {
          issuerUserId: auth.actor.user.id,
          requestId,
          reviewerNoteLength: body?.reviewerNote?.trim().length ?? 0,
        });
        const reviewedRequest = approveVerificationRequest(
          auth.state,
          requestId,
          auth.actor.user.id,
          body?.reviewerNote ?? null,
        );
        writeState(auth.state);

        return json(200, {
          request: formatVerificationRequest(auth.state, reviewedRequest),
        });
      } catch (error) {
        if (error instanceof VerificationError) {
          console.error("[verification-api] issuer approve validation error", {
            issuerUserId: auth.actor.user.id,
            requestId,
            error: error.message,
            status: error.status,
          });
          return json(error.status, { error: error.message });
        }

        console.error("[verification-api] issuer approve unexpected error", error);
        throw error;
      }
    }

    if (
      pathname.startsWith("/issuer/verification/requests/") &&
      pathname.endsWith("/reject") &&
      request.method === "POST"
    ) {
      const auth = requireAuth(request);
      if (auth.error || !auth.actor) {
        return auth.error!;
      }

      if (auth.actor.user.role !== "issuer") {
        return json(403, { error: "Issuer access required." });
      }

      const requestId = pathname.replace("/issuer/verification/requests/", "").replace("/reject", "");
      const body = await parseJson<{ reviewerNote?: string }>(request);

      try {
        console.info("[verification-api] issuer reject received", {
          issuerUserId: auth.actor.user.id,
          requestId,
          reviewerNoteLength: body?.reviewerNote?.trim().length ?? 0,
        });
        const reviewedRequest = rejectVerificationRequest(
          auth.state,
          requestId,
          auth.actor.user.id,
          body?.reviewerNote ?? null,
        );
        writeState(auth.state);

        return json(200, {
          request: formatVerificationRequest(auth.state, reviewedRequest),
        });
      } catch (error) {
        if (error instanceof VerificationError) {
          console.error("[verification-api] issuer reject validation error", {
            issuerUserId: auth.actor.user.id,
            requestId,
            error: error.message,
            status: error.status,
          });
          return json(error.status, { error: error.message });
        }

        console.error("[verification-api] issuer reject unexpected error", error);
        throw error;
      }
    }

    if (pathname === "/admin/verification/requests" && request.method === "GET") {
      const auth = requireAuth(request);
      if (auth.error || !auth.actor) {
        return auth.error!;
      }

      if (auth.actor.user.role !== "admin") {
        return json(403, { error: "Admin access required." });
      }

      console.info("[verification-api] admin list", {
        adminUserId: auth.actor.user.id,
        requestCount: auth.state.verificationRequests.length,
      });

      return json(200, listAdminVerificationRequests(auth.state));
    }

    if (
      pathname.startsWith("/admin/verification/requests/") &&
      pathname.endsWith("/approve") &&
      request.method === "POST"
    ) {
      const auth = requireAuth(request);
      if (auth.error || !auth.actor) {
        return auth.error!;
      }

      if (auth.actor.user.role !== "admin") {
        return json(403, { error: "Admin access required." });
      }

      const requestId = pathname.replace("/admin/verification/requests/", "").replace("/approve", "");
      const body = await parseJson<{ reviewerNote?: string }>(request);

      try {
        console.info("[verification-api] admin approve received", {
          adminUserId: auth.actor.user.id,
          requestId,
          reviewerNoteLength: body?.reviewerNote?.trim().length ?? 0,
        });
        const reviewedRequest = approveVerificationRequestAsAdmin(
          auth.state,
          requestId,
          auth.actor.user.id,
          body?.reviewerNote ?? null,
        );
        writeState(auth.state);

        return json(200, {
          request: formatVerificationRequest(auth.state, reviewedRequest),
        });
      } catch (error) {
        if (error instanceof VerificationError) {
          console.error("[verification-api] admin approve validation error", {
            adminUserId: auth.actor.user.id,
            requestId,
            error: error.message,
            status: error.status,
          });
          return json(error.status, { error: error.message });
        }

        console.error("[verification-api] admin approve unexpected error", error);
        throw error;
      }
    }

    if (
      pathname.startsWith("/admin/verification/requests/") &&
      pathname.endsWith("/reject") &&
      request.method === "POST"
    ) {
      const auth = requireAuth(request);
      if (auth.error || !auth.actor) {
        return auth.error!;
      }

      if (auth.actor.user.role !== "admin") {
        return json(403, { error: "Admin access required." });
      }

      const requestId = pathname.replace("/admin/verification/requests/", "").replace("/reject", "");
      const body = await parseJson<{ reviewerNote?: string }>(request);

      try {
        console.info("[verification-api] admin reject received", {
          adminUserId: auth.actor.user.id,
          requestId,
          reviewerNoteLength: body?.reviewerNote?.trim().length ?? 0,
        });
        const reviewedRequest = rejectVerificationRequestAsAdmin(
          auth.state,
          requestId,
          auth.actor.user.id,
          body?.reviewerNote ?? null,
        );
        writeState(auth.state);

        return json(200, {
          request: formatVerificationRequest(auth.state, reviewedRequest),
        });
      } catch (error) {
        if (error instanceof VerificationError) {
          console.error("[verification-api] admin reject validation error", {
            adminUserId: auth.actor.user.id,
            requestId,
            error: error.message,
            status: error.status,
          });
          return json(error.status, { error: error.message });
        }

        console.error("[verification-api] admin reject unexpected error", error);
        throw error;
      }
    }

    if (pathname === "/documents" && request.method === "GET") {
      const auth = requireAuth(request);
      if (auth.error || !auth.actor) {
        return auth.error!;
      }

      const kycRecord = auth.state.kycRecords.find((value) => value.userId === auth.actor?.user.id) ?? null;
      const accessiblePropertyIds = new Set<string>();

      auth.state.holdings
        .filter((value) => value.userId === auth.actor?.user.id && value.units > 0)
        .forEach((value) => accessiblePropertyIds.add(value.propertyId));

      if (auth.actor.user.role === "issuer") {
        auth.state.properties
          .filter((value) => value.issuerId === auth.actor?.user.id)
          .forEach((value) => accessiblePropertyIds.add(value.id));
      }

      const propertyDocuments = auth.state.propertyDocuments
        .filter((value) => accessiblePropertyIds.has(value.propertyId))
        .map((value) => ({
          ...value,
          property: formatProperty(auth.state, getPropertyById(auth.state, value.propertyId)!),
        }));

      return json(200, { kycRecord, propertyDocuments });
    }

    if (pathname === "/issuer/projects" && request.method === "GET") {
      const auth = requireAuth(request);
      if (auth.error || !auth.actor) {
        return auth.error!;
      }

      if (!requireRole(toPublicUser(auth.actor.user), ["issuer", "admin"])) {
        return json(403, { error: "Issuer or admin access required." });
      }

      const properties = auth.state.properties
        .filter((value) =>
          auth.actor?.user.role === "admin" ? true : value.issuerId === auth.actor?.user.id,
        )
        .map((value) => formatProperty(auth.state, value));

      return json(200, { properties });
    }

    if (pathname === "/issuer/projects" && request.method === "POST") {
      const auth = requireAuth(request);
      if (auth.error || !auth.actor) {
        return auth.error!;
      }

      if (auth.actor.user.role !== "issuer") {
        return json(403, { error: "Issuer access required." });
      }

      try {
        const formData = await request.formData();
        const assetClassValue = readRequiredFormField(formData, "assetClass", "Asset class", 40);
        if (assetClassValue !== "real_estate" && assetClassValue !== "company_share") {
          return json(400, { error: "Select a valid asset class." });
        }

        const body = {
          assetClass: assetClassValue as AssetClass,
          assetType: readRequiredFormField(formData, "assetType", "Asset type", 120),
          symbol: readRequiredFormField(formData, "symbol", "Ticker / unit symbol", 32),
          name: readRequiredFormField(formData, "name", "Asset name", 120),
          city: readRequiredFormField(formData, "city", "City", 80),
          state: readRequiredFormField(formData, "state", "State", 80),
          marketSegment: readRequiredFormField(formData, "marketSegment", "Market segment", 80),
          registrationRef: readRequiredFormField(formData, "registrationRef", "Registration reference", 160),
          summary: readRequiredFormField(formData, "summary", "Summary", 800),
          structureName: readRequiredFormField(formData, "structureName", "Structure name", 120),
          targetYieldBps: readIntegerFormField(formData, "targetYieldBps", "Target yield (bps)", {
            min: 0,
            allowZero: true,
          }),
          targetIrrBps: readIntegerFormField(formData, "targetIrrBps", "Target IRR (bps)"),
          expectedExitMonths: readIntegerFormField(
            formData,
            "expectedExitMonths",
            "Expected exit (months)",
          ),
          minimumInvestmentInrMinor: readIntegerFormField(
            formData,
            "minimumInvestmentInrMinor",
            "Minimum investment (INR)",
          ),
          unitPriceInrMinor: readIntegerFormField(formData, "unitPriceInrMinor", "Unit price (INR)"),
          totalUnits: readIntegerFormField(formData, "totalUnits", "Total units"),
        };
        const attachments = formData
          .getAll("documents")
          .filter((value): value is File => value instanceof File);

        validateVerificationFiles(
          attachments.map((value) => ({
            name: value.name,
            type: value.type,
            size: value.size,
          })),
        );

        const slug = body.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
        const code = (body.symbol || slug)
          .toUpperCase()
          .replace(/[^A-Z0-9]+/g, "-")
          .replace(/^-|-$/g, "")
          .slice(0, 32);
        const state = auth.state;
        const property: PropertyProject = {
          id: `property_${crypto.randomUUID().slice(0, 8)}`,
          slug,
          issuerId: auth.actor.user.id,
          code: code || `ASSET-${crypto.randomUUID().slice(0, 6).toUpperCase()}`,
          name: body.name,
          assetClass: body.assetClass,
          assetType: body.assetType,
          symbol: body.symbol,
          city: body.city,
          state: body.state,
          marketSegment: body.marketSegment,
          summary: body.summary,
          heroTag:
            body.assetClass === "company_share"
              ? `Company shares · ${body.assetType}`
              : `Real estate · ${body.assetType}`,
          riskBand: body.assetClass === "company_share" ? "Growth" : "Core Plus",
          registrationRef: body.registrationRef,
          structureName: body.structureName,
          structureType: "Private Limited",
          targetYieldBps: body.targetYieldBps,
          targetIrrBps: body.targetIrrBps,
          expectedExitMonths: body.expectedExitMonths,
          minimumInvestmentInrMinor: body.minimumInvestmentInrMinor,
          unitPriceInrMinor: body.unitPriceInrMinor,
          totalUnits: body.totalUnits,
          availableUnits: body.totalUnits,
          fundedUnits: 0,
          status: "review",
          createdAt: new Date().toISOString(),
          approvedAt: null,
          liveAt: null,
          onChainPropertyAddress: null,
          onChainOfferingAddress: null,
          submissionSignature: null,
          approvalSignature: null,
          publicationSignature: null,
          lastChainSyncAt: null,
        };

        state.properties.unshift(property);

        const uploadedDocuments: LocalState["propertyDocuments"] = [];

        for (const file of attachments) {
          const documentId = `doc_${crypto.randomUUID().slice(0, 8)}`;
          const mimeType = inferVerificationMimeType(file.name, file.type);
          const uploadedAt = new Date().toISOString();
          const storagePath = writePropertyDocumentFile(
            property.id,
            documentId,
            file.name,
            new Uint8Array(await file.arrayBuffer()),
          );

          uploadedDocuments.push({
            id: documentId,
            propertyId: property.id,
            name: file.name,
            category: "Issuer submission",
            status: "pending",
            source: "issuer",
            url: `http://127.0.0.1:${API_PORT}/property-documents/files/${documentId}`,
            updatedAt: uploadedAt,
            mimeType,
            sizeBytes: file.size,
            uploadedAt,
            storagePath,
          });
        }

        state.propertyDocuments.unshift(...uploadedDocuments.reverse());

        addNotification(
          state,
          "user_admin",
          "Asset review required",
          `${property.name} was submitted by ${auth.actor.user.fullName} with ${attachments.length} supporting document${attachments.length === 1 ? "" : "s"}.`,
        );

        const syncedState = await syncChainReadModelSafely(state);
        return json(201, { property: formatProperty(syncedState, property) });
      } catch (error) {
        if (error instanceof VerificationError) {
          return json(error.status, { error: error.message });
        }

        throw error;
      }
    }

    if (pathname === "/admin/overview" && request.method === "GET") {
      const auth = requireAuth(request);
      if (auth.error || !auth.actor) {
        return auth.error!;
      }

      if (auth.actor.user.role !== "admin") {
        return json(403, { error: "Admin access required." });
      }

      const pendingKyc = auth.state.kycRecords
        .filter((value) => value.status === "pending")
        .map((value) => ({
          ...value,
          user: toPublicUser(auth.state.users.find((user) => user.id === value.userId)!),
        }));

      const reviewProperties = auth.state.properties
        .filter(
          (value) =>
            value.status === "review" || value.status === "approved" || value.status === "rejected",
        )
        .map((value) => ({
          ...formatProperty(auth.state, value),
          documents: getPropertyDocuments(auth.state, value.id),
        }));

      const settlementQueue = auth.state.jobs
        .filter((value) => value.status === "queued" || value.status === "processing")
        .sort((a, b) => Date.parse(a.availableAt) - Date.parse(b.availableAt));

      return json(200, {
        stats: {
          pendingKyc: pendingKyc.length,
          reviewProperties: reviewProperties.length,
          settlementQueue: settlementQueue.length,
          treasuryBalanceInrMinor: auth.state.platformTreasuryInrMinor,
        },
        pendingKyc,
        reviewProperties,
        settlementQueue,
      });
    }

    if (pathname.startsWith("/admin/kyc/") && pathname.endsWith("/approve") && request.method === "POST") {
      const auth = requireAuth(request);
      if (auth.error || !auth.actor) {
        return auth.error!;
      }

      if (auth.actor.user.role !== "admin") {
        return json(403, { error: "Admin access required." });
      }

      const kycId = pathname.replace("/admin/kyc/", "").replace("/approve", "");

      const result = mutateState((state) => {
        const record = state.kycRecords.find((value) => value.id === kycId);
        if (!record) {
          return { error: "KYC record not found." };
        }

        record.status = "approved";
        record.reviewedAt = new Date().toISOString();
        record.reviewerId = auth.actor!.user.id;

        const currentUser = state.users.find((value) => value.id === record.userId)!;
        currentUser.kycStatus = "approved";

        addNotification(
          state,
          currentUser.id,
          "KYC approved",
          "Your investor account is now approved for primary and secondary investment flows.",
        );

        return { record };
      });

      if ("error" in result) {
        return json(404, result);
      }

      return json(200, result);
    }

    if (pathname.startsWith("/admin/kyc/") && pathname.endsWith("/reject") && request.method === "POST") {
      const auth = requireAuth(request);
      if (auth.error || !auth.actor) {
        return auth.error!;
      }

      if (auth.actor.user.role !== "admin") {
        return json(403, { error: "Admin access required." });
      }

      const kycId = pathname.replace("/admin/kyc/", "").replace("/reject", "");

      const result = mutateState((state) => {
        const record = state.kycRecords.find((value) => value.id === kycId);
        if (!record) {
          return { error: "KYC record not found." };
        }

        record.status = "rejected";
        record.reviewedAt = new Date().toISOString();
        record.reviewerId = auth.actor!.user.id;

        const currentUser = state.users.find((value) => value.id === record.userId)!;
        currentUser.kycStatus = "rejected";

        addNotification(
          state,
          currentUser.id,
          "KYC rejected",
          "Your submission needs corrections before investing can continue.",
        );

        return { record };
      });

      if ("error" in result) {
        return json(404, result);
      }

      return json(200, result);
    }

    if (pathname.startsWith("/admin/properties/") && pathname.endsWith("/approve") && request.method === "POST") {
      const auth = requireAuth(request);
      if (auth.error || !auth.actor) {
        return auth.error!;
      }

      if (auth.actor.user.role !== "admin") {
        return json(403, { error: "Admin access required." });
      }

      const propertyId = pathname.replace("/admin/properties/", "").replace("/approve", "");
      const state = auth.state;
      const property = state.properties.find((value) => value.id === propertyId);
      if (!property) {
        return json(404, { error: "Asset not found." });
      }

      property.status = "approved";
      property.approvedAt = new Date().toISOString();

      addNotification(
        state,
        property.issuerId,
        "Asset approved",
        `${property.name} passed compliance review and is ready to publish locally.`,
      );

      await syncChainReadModel(state);
      return json(200, { property: formatProperty(state, property) });
    }

    if (pathname.startsWith("/admin/properties/") && pathname.endsWith("/reject") && request.method === "POST") {
      const auth = requireAuth(request);
      if (auth.error || !auth.actor) {
        return auth.error!;
      }

      if (auth.actor.user.role !== "admin") {
        return json(403, { error: "Admin access required." });
      }

      const propertyId = pathname.replace("/admin/properties/", "").replace("/reject", "");
      const state = auth.state;
      const property = state.properties.find((value) => value.id === propertyId);
      if (!property) {
        return json(404, { error: "Asset not found." });
      }

      property.status = "rejected";
      property.approvedAt = null;

      addNotification(
        state,
        property.issuerId,
        "Asset rejected",
        `${property.name} needs corrections before it can move into tokenization review again.`,
      );

      writeState(state);
      return json(200, { property: formatProperty(state, property) });
    }

    if (pathname.startsWith("/admin/properties/") && pathname.endsWith("/publish") && request.method === "POST") {
      const auth = requireAuth(request);
      if (auth.error || !auth.actor) {
        return auth.error!;
      }

      if (auth.actor.user.role !== "admin") {
        return json(403, { error: "Admin access required." });
      }

      const propertyId = pathname.replace("/admin/properties/", "").replace("/publish", "");
      const state = auth.state;
      const property = state.properties.find((value) => value.id === propertyId);
      if (!property) {
        return json(404, { error: "Asset not found." });
      }

      property.status = "live";
      property.liveAt = new Date().toISOString();

      state.propertyDocuments = state.propertyDocuments.map((value) =>
        value.propertyId === property.id ? { ...value, status: "approved" } : value,
      );

      addNotification(
        state,
        property.issuerId,
        "Asset is live",
        `${property.name} is now visible in the live asset marketplace.`,
      );

      await syncChainReadModel(state);
      return json(200, { property: formatProperty(state, property) });
    }

    return json(404, { error: "Not found." });
  },
});

console.log(`Eternal local API listening on http://127.0.0.1:${server.port}`);

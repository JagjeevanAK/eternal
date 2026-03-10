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
} from "./domain";
import {
  addNotification,
  ensureStateFile,
  enqueueJob,
  getAvailableUnitsForListing,
  getHolding,
  getPropertyById,
  getPropertyDocuments,
  getUserByToken,
  listDemoUsers,
  mutateState,
  readState,
  resetState,
  toPublicUser,
  writeState,
} from "./state";
import { createListingOnChain, syncStateToChain } from "./chain";

const API_PORT = Number(process.env.PORT ?? "4000");
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;

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

const parseJson = async <T>(request: Request) => {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
};

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
});

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

    if (pathname === "/auth/otp" && request.method === "POST") {
      const body = await parseJson<{ identifier?: string }>(request);
      if (!body?.identifier) {
        return json(400, { error: "Identifier is required." });
      }

      const state = readState();
      const account = state.users.find(
        (value) => value.email === body.identifier || value.phone === body.identifier,
      );

      if (!account) {
        return json(404, { error: "No demo account matches that identifier." });
      }

      return json(200, {
        challengeId: `otp_${account.id}`,
        destination: account.phone,
        codeHint: "Use 000000 in local mode.",
      });
    }

    if (pathname === "/auth/verify" && request.method === "POST") {
      const body = await parseJson<{ identifier?: string; code?: string }>(request);
      if (!body?.identifier || !body.code) {
        return json(400, { error: "Identifier and code are required." });
      }

      if (body.code !== "000000") {
        return json(400, { error: "Local mode accepts only 000000." });
      }

      const state = readState();
      const account = state.users.find(
        (value) => value.email === body.identifier || value.phone === body.identifier,
      );

      if (!account) {
        return json(404, { error: "Account not found." });
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
      const state = await syncChainReadModel(readState());
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
      const state = await syncChainReadModel(readState());
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

      const state = auth.state;
      const currentUser = state.users.find((value) => value.id === auth.actor?.user.id)!;
      currentUser.externalWalletAddress = body.address;
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

      const state = await syncChainReadModel(auth.state);
      const summary = dashboardSummary(state, auth.actor.user.id);
      return json(200, summary ?? { error: "Dashboard unavailable." });
    }

    if (pathname === "/portfolio" && request.method === "GET") {
      const auth = requireAuth(request);
      if (auth.error || !auth.actor) {
        return auth.error!;
      }

      const state = await syncChainReadModel(auth.state);

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

      const payments = auth.state.payments
        .filter((value) => value.userId === auth.actor?.user.id)
        .map((value) => {
          const order = auth.state.orders.find((record) => record.id === value.orderId)!;
          return {
            ...value,
            order,
            property: formatProperty(auth.state, getPropertyById(auth.state, order.propertyId)!),
          };
        })
        .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));

      return json(200, {
        cashBalanceInrMinor: auth.actor.user.cashBalanceInrMinor,
        payments,
      });
    }

    if (pathname.startsWith("/payments/") && pathname.endsWith("/pay") && request.method === "POST") {
      const auth = requireAuth(request);
      if (auth.error || !auth.actor) {
        return auth.error!;
      }

      const paymentId = pathname.replace("/payments/", "").replace("/pay", "");

      const result = mutateState((state) => {
        const payment = state.payments.find(
          (value) => value.id === paymentId && value.userId === auth.actor?.user.id,
        );
        if (!payment) {
          return { error: "Payment not found." };
        }

        if (payment.status !== "pending") {
          return { error: "Only pending payments can be marked as paid." };
        }

        const order = state.orders.find((value) => value.id === payment.orderId)!;
        const currentUser = state.users.find((value) => value.id === auth.actor?.user.id)!;

        if (currentUser.cashBalanceInrMinor < payment.amountInrMinor) {
          return { error: "Insufficient mock INR balance." };
        }

        currentUser.cashBalanceInrMinor -= payment.amountInrMinor;
        payment.status = "paid";
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
          "Payment captured",
          `Payment ${payment.reference} is captured and waiting for local settlement.`,
        );

        return { payment, order };
      });

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

      const order = createPrimaryOrder(property, auth.actor.user.id, body.units, state.config.primaryFeeBps);
      const payment = createPayment(order);
      order.paymentId = payment.id;

      state.orders.unshift(order);
      state.payments.unshift(payment);

      addNotification(
        state,
        auth.actor.user.id,
        "Primary order created",
        `${body.units} units are reserved in the order book. Complete the mock payment to settle them on localnet.`,
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
        `${body.units} units are now awaiting payment before localnet settlement.`,
      );

      writeState(state);
      return json(201, { order, payment });
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

      const body = await parseJson<{
        assetClass?: AssetClass;
        assetType?: string;
        symbol?: string;
        name?: string;
        city?: string;
        state?: string;
        marketSegment?: string;
        registrationRef?: string;
        summary?: string;
        structureName?: string;
        targetYieldBps?: number;
        targetIrrBps?: number;
        expectedExitMonths?: number;
        minimumInvestmentInrMinor?: number;
        unitPriceInrMinor?: number;
        totalUnits?: number;
      }>(request);

      if (
        !body?.assetClass ||
        !body.assetType ||
        !body.symbol ||
        !body.name ||
        !body.city ||
        !body.state ||
        !body.marketSegment ||
        !body.registrationRef ||
        !body.summary ||
        !body.structureName ||
        body.targetYieldBps == null ||
        body.targetIrrBps == null ||
        body.minimumInvestmentInrMinor == null ||
        body.unitPriceInrMinor == null ||
        body.totalUnits == null
      ) {
        return json(400, { error: "All asset submission fields are required." });
      }

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
        expectedExitMonths: body.expectedExitMonths ?? (body.assetClass === "company_share" ? 48 : 72),
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
      state.propertyDocuments.unshift(
        {
          id: `doc_${crypto.randomUUID().slice(0, 8)}`,
          propertyId: property.id,
          name: "Issuer deck",
          category: "Marketing",
          status: "pending",
          source: "issuer",
          url: `https://local.eternal.test/docs/${property.slug}/issuer-deck.pdf`,
          updatedAt: new Date().toISOString(),
        },
        {
          id: `doc_${crypto.randomUUID().slice(0, 8)}`,
          propertyId: property.id,
          name: "Legal diligence pack",
          category: "Legal",
          status: "pending",
          source: "legal",
          url: `https://local.eternal.test/docs/${property.slug}/legal-pack.pdf`,
          updatedAt: new Date().toISOString(),
        },
      );

      addNotification(
        state,
        "user_admin",
        "Asset review required",
        `${property.name} was submitted by ${auth.actor.user.fullName}.`,
      );

      await syncChainReadModel(state);
      return json(201, { property: formatProperty(state, property) });
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
        .filter((value) => value.status === "review" || value.status === "approved")
        .map((value) => formatProperty(auth.state, value));

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

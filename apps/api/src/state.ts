import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "fs";
import path from "path";
import { ensureAuthStore, loadAuthSnapshot, replaceAuthSnapshot } from "./auth-store";
import type {
  Holding,
  KycRecord,
  LocalState,
  Notification,
  PropertyDocument,
  PropertyProject,
  PublicUser,
  QueueJob,
  User,
  VerificationRequest,
} from "./domain";
import { getManagedWalletAddress } from "./wallets";

const ROOT_DIR = path.resolve(import.meta.dir, "../../..");
const STORAGE_DIR = path.join(ROOT_DIR, ".eternal-local");
const STATE_PATH = path.join(STORAGE_DIR, "state.json");
const UPLOADS_DIR = path.join(STORAGE_DIR, "uploads");
const VERIFICATION_UPLOAD_DIR = path.join(UPLOADS_DIR, "verification");
const PROPERTY_DOCUMENT_UPLOAD_DIR = path.join(UPLOADS_DIR, "property-documents");
const LOCAL_API_PORT = Number(process.env.PORT ?? "4000");
const LOCAL_API_BASE_URL = process.env.LOCAL_API_URL ?? `http://127.0.0.1:${LOCAL_API_PORT}`;
const PROPERTY_DOCUMENT_SEED_ASSET_DIR = path.join(ROOT_DIR, "apps/api/seed-assets/property-documents");
const SEED_PROPERTY_DOCUMENT_ASSETS: Record<string, string> = {
  "property_whitefield_income_commons:Title Report": "seed-title-report.jpeg",
  "property_whitefield_income_commons:Lease Summary": "seed-lease-summary.jpeg",
  "property_whitefield_income_commons:Valuation Memo": "seed-valuation-memo.png",
  "property_monsoon_logistics_growth_shares:Shareholder Rights Summary": "seed-title-report.jpeg",
  "property_monsoon_logistics_growth_shares:Growth Round Memo": "seed-lease-summary.jpeg",
  "property_monsoon_logistics_growth_shares:Financial Snapshot": "seed-valuation-memo.png",
  "property_pune_logistics_land_parcel:Project Teaser": "seed-lease-summary.jpeg",
  "property_pune_logistics_land_parcel:Land Due Diligence": "seed-title-report.jpeg",
};

const nowIso = () => new Date().toISOString();

const plusDays = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
};

const makeId = (prefix: string) => `${prefix}_${crypto.randomUUID().slice(0, 8)}`;

const buildPropertyDocumentUrl = (documentId: string) =>
  `${LOCAL_API_BASE_URL}/property-documents/files/${documentId}`;

const getSeedPropertyDocumentAssetFileName = (propertyId: string, name: string) =>
  SEED_PROPERTY_DOCUMENT_ASSETS[`${propertyId}:${name}`] ?? null;

const inferSeedPropertyDocumentMimeType = (fileName: string) => {
  const extension = path.extname(fileName).toLowerCase();

  if (extension === ".png") {
    return "image/png";
  }

  if (extension === ".jpg" || extension === ".jpeg") {
    return "image/jpeg";
  }

  if (extension === ".pdf") {
    return "application/pdf";
  }

  return "application/octet-stream";
};

const materializeSeedPropertyDocumentFile = ({
  id,
  propertyId,
  name,
  updatedAt,
}: Pick<PropertyDocument, "id" | "propertyId" | "name" | "updatedAt">) => {
  const assetFileName = getSeedPropertyDocumentAssetFileName(propertyId, name);
  if (!assetFileName) {
    return null;
  }

  const absoluteAssetPath = path.join(PROPERTY_DOCUMENT_SEED_ASSET_DIR, assetFileName);
  if (!existsSync(absoluteAssetPath)) {
    return null;
  }

  const bytes = readFileSync(absoluteAssetPath);

  return {
    mimeType: inferSeedPropertyDocumentMimeType(assetFileName),
    sizeBytes: bytes.byteLength,
    uploadedAt: updatedAt,
    storagePath: writePropertyDocumentFile(propertyId, id, assetFileName, bytes),
  };
};

const hasSeededPropertyDocumentFile = (storagePath?: string) => {
  if (!storagePath) {
    return false;
  }

  try {
    return existsSync(getPropertyDocumentAbsolutePath(storagePath));
  } catch {
    return false;
  }
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const makePropertyCode = (symbol: string, fallback: string) => {
  const normalized = (symbol || fallback)
    .toUpperCase()
    .trim()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 32);

  return normalized || `ASSET-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
};

const user = (
  id: string,
  role: User["role"],
  fullName: string,
  email: string,
  phone: string,
  city: string,
  managedWalletAddress: string,
  kycStatus: User["kycStatus"],
  cashBalanceInrMinor: number,
): User => ({
  id,
  role,
  fullName,
  email,
  phone,
  city,
  managedWalletAddress,
  externalWalletAddress: null,
  kycStatus,
  cashBalanceInrMinor,
  createdAt: nowIso(),
});

const kyc = (
  userId: string,
  status: KycRecord["status"],
  panMasked: string,
  aadhaarMasked: string,
  occupation: string,
  annualIncomeBand: string,
  notes: string,
): KycRecord => ({
  id: makeId("kyc"),
  userId,
  status,
  panMasked,
  aadhaarMasked,
  occupation,
  annualIncomeBand,
  notes,
  submittedAt: status === "not_started" ? null : nowIso(),
  reviewedAt: status === "approved" ? nowIso() : null,
  reviewerId: status === "approved" ? "user_admin" : null,
});

type PropertyInput = Omit<
  PropertyProject,
  | "createdAt"
  | "approvedAt"
  | "liveAt"
  | "onChainPropertyAddress"
  | "onChainOfferingAddress"
  | "submissionSignature"
  | "approvalSignature"
  | "publicationSignature"
  | "lastChainSyncAt"
> & {
  createdAt?: string;
  approvedAt?: string | null;
  liveAt?: string | null;
  onChainPropertyAddress?: string | null;
  onChainOfferingAddress?: string | null;
  submissionSignature?: string | null;
  approvalSignature?: string | null;
  publicationSignature?: string | null;
  lastChainSyncAt?: string | null;
};

const property = (values: PropertyInput): PropertyProject => ({
  ...values,
  createdAt: values.createdAt ?? nowIso(),
  approvedAt: values.approvedAt ?? null,
  liveAt: values.liveAt ?? null,
  onChainPropertyAddress: values.onChainPropertyAddress ?? null,
  onChainOfferingAddress: values.onChainOfferingAddress ?? null,
  submissionSignature: values.submissionSignature ?? null,
  approvalSignature: values.approvalSignature ?? null,
  publicationSignature: values.publicationSignature ?? null,
  lastChainSyncAt: values.lastChainSyncAt ?? null,
});

const holding = (
  userId: string,
  propertyId: string,
  units: number,
  averagePriceInrMinor: number,
): Holding => ({
  id: makeId("holding"),
  userId,
  propertyId,
  units,
  averagePriceInrMinor,
  investedAmountInrMinor: units * averagePriceInrMinor,
  createdAt: nowIso(),
  updatedAt: nowIso(),
  onChainAddress: null,
});

const document = (
  propertyId: string,
  name: string,
  category: string,
  source: PropertyDocument["source"],
  status: PropertyDocument["status"] = "approved",
): PropertyDocument => {
  const id = makeId("doc");
  const updatedAt = nowIso();
  const seededFile = materializeSeedPropertyDocumentFile({ id, propertyId, name, updatedAt });

  return {
    id,
    propertyId,
    name,
    category,
    source,
    status,
    url: seededFile
      ? buildPropertyDocumentUrl(id)
      : `https://local.eternal.test/docs/${propertyId}/${name.toLowerCase().replace(/\s+/g, "-")}.pdf`,
    updatedAt,
    mimeType: seededFile?.mimeType,
    sizeBytes: seededFile?.sizeBytes,
    uploadedAt: seededFile?.uploadedAt,
    storagePath: seededFile?.storagePath,
  };
};

const notification = (userId: string, title: string, body: string): Notification => ({
  id: makeId("notification"),
  userId,
  title,
  body,
  createdAt: nowIso(),
  readAt: null,
});

const queueJob = (
  type: QueueJob["type"],
  payload: QueueJob["payload"],
  delayMs = 0,
): QueueJob => ({
  id: makeId("job"),
  type,
  status: "queued",
  payload,
  attempts: 0,
  createdAt: nowIso(),
  availableAt: new Date(Date.now() + delayMs).toISOString(),
  completedAt: null,
  lastError: null,
  transactionSignature: null,
});

const createSeedState = (): LocalState => {
  const users: User[] = [
    user(
      "user_admin",
      "admin",
      "Aarav Compliance",
      "admin@eternal.local",
      "+91 90000 00001",
      "Bengaluru",
      getManagedWalletAddress("user_admin"),
      "approved",
      0,
    ),
    user(
      "user_issuer",
      "issuer",
      "Meera Capital Partners",
      "issuer@eternal.local",
      "+91 90000 00002",
      "Mumbai",
      getManagedWalletAddress("user_issuer"),
      "approved",
      8_50_00_000,
    ),
    user(
      "user_investor_alpha",
      "investor",
      "Rohan Shah",
      "alpha@eternal.local",
      "+91 90000 00003",
      "Ahmedabad",
      getManagedWalletAddress("user_investor_alpha"),
      "approved",
      75_00_000,
    ),
    user(
      "user_investor_beta",
      "investor",
      "Ananya Rao",
      "beta@eternal.local",
      "+91 90000 00004",
      "Hyderabad",
      getManagedWalletAddress("user_investor_beta"),
      "approved",
      62_50_000,
    ),
    user(
      "user_investor_pending",
      "investor",
      "Ishaan Verma",
      "pending@eternal.local",
      "+91 90000 00005",
      "Delhi NCR",
      getManagedWalletAddress("user_investor_pending"),
      "not_started",
      40_00_000,
    ),
  ];

  const kycRecords: KycRecord[] = [
    kyc("user_admin", "approved", "AAAAA1234A", "0001", "Compliance", "Above 50L", "Seed admin"),
    kyc("user_issuer", "approved", "BBBBB2345B", "0002", "Issuer", "Above 50L", "Seed issuer"),
    kyc("user_investor_alpha", "approved", "CCCCC3456C", "0003", "Founder", "Above 50L", "Approved investor"),
    kyc("user_investor_beta", "approved", "DDDDD4567D", "0004", "Product Lead", "25L - 50L", "Approved investor"),
    kyc("user_investor_pending", "not_started", "", "", "", "", "KYC not started"),
  ];

  const properties: PropertyProject[] = [
    property({
      id: "property_whitefield_income_commons",
      slug: "whitefield-income-commons",
      issuerId: "user_issuer",
      code: makePropertyCode("WIC-UNIT-A", "whitefield-income-commons"),
      name: "Whitefield Income Commons",
      assetClass: "real_estate",
      assetType: "Commercial building",
      symbol: "WIC-UNIT-A",
      city: "Bengaluru",
      state: "Karnataka",
      marketSegment: "Whitefield",
      summary:
        "A stabilized office-led real-estate issue backed by a leased commercial building with quarterly distributions and a five-year target hold.",
      heroTag: "Real estate · leased commercial building",
      riskBand: "Core",
      registrationRef: "PRM/KA/RERA/1251/446/PR/LOCAL1234",
      structureName: "Whitefield Commons SPV LLP",
      structureType: "LLP",
      targetYieldBps: 920,
      targetIrrBps: 1460,
      expectedExitMonths: 60,
      minimumInvestmentInrMinor: 2_50_000,
      unitPriceInrMinor: 25_000,
      totalUnits: 1200,
      availableUnits: 980,
      fundedUnits: 220,
      status: "live",
      approvedAt: nowIso(),
      liveAt: nowIso(),
    }),
    property({
      id: "property_monsoon_logistics_growth_shares",
      slug: "monsoon-logistics-growth-shares",
      issuerId: "user_issuer",
      code: makePropertyCode("MONSOON-GS1", "monsoon-logistics-growth-shares"),
      name: "Monsoon Logistics Growth Shares",
      assetClass: "company_share",
      assetType: "Growth equity",
      symbol: "MONSOON-GS1",
      city: "Mumbai",
      state: "Maharashtra",
      marketSegment: "Logistics software",
      summary:
        "A fixed-price company-share issuance for a logistics software operator expanding warehousing automation across India.",
      heroTag: "Company shares · growth round",
      riskBand: "Growth",
      registrationRef: "CIN U63030MH2022PTC123456 / Series A",
      structureName: "Monsoon Logistics Private Limited",
      structureType: "Private Limited",
      targetYieldBps: 0,
      targetIrrBps: 2400,
      expectedExitMonths: 48,
      minimumInvestmentInrMinor: 1_50_000,
      unitPriceInrMinor: 15_000,
      totalUnits: 5000,
      availableUnits: 4_880,
      fundedUnits: 120,
      status: "live",
      approvedAt: nowIso(),
      liveAt: nowIso(),
    }),
    property({
      id: "property_pune_logistics_land_parcel",
      slug: "pune-logistics-land-parcel",
      issuerId: "user_issuer",
      code: makePropertyCode("PUNE-LAND-01", "pune-logistics-land-parcel"),
      name: "Pune Logistics Land Parcel",
      assetClass: "real_estate",
      assetType: "Industrial land parcel",
      symbol: "PUNE-LAND-01",
      city: "Pune",
      state: "Maharashtra",
      marketSegment: "Chakan",
      summary:
        "A serviced logistics land issue prepared for build-to-suit warehousing, currently waiting for compliance review before going live.",
      heroTag: "Real estate · industrial land",
      riskBand: "Core Plus",
      registrationRef: "LAND-MA-LOCAL5678",
      structureName: "Pune Land Parcel SPV Private Limited",
      structureType: "Private Limited",
      targetYieldBps: 1040,
      targetIrrBps: 1710,
      expectedExitMonths: 72,
      minimumInvestmentInrMinor: 3_00_000,
      unitPriceInrMinor: 30_000,
      totalUnits: 1600,
      availableUnits: 1600,
      fundedUnits: 0,
      status: "review",
    }),
  ];

  const holdings: Holding[] = [
    holding("user_investor_alpha", "property_whitefield_income_commons", 120, 25_000),
    holding("user_investor_beta", "property_whitefield_income_commons", 100, 25_000),
    holding("user_investor_alpha", "property_monsoon_logistics_growth_shares", 80, 15_000),
    holding("user_investor_beta", "property_monsoon_logistics_growth_shares", 40, 15_000),
  ];

  const listingId = "listing_whitefield_alpha";

  const propertyDocuments: PropertyDocument[] = [
    document("property_whitefield_income_commons", "Title Report", "Legal", "legal"),
    document("property_whitefield_income_commons", "Lease Summary", "Commercial", "issuer"),
    document("property_whitefield_income_commons", "Valuation Memo", "Valuation", "compliance"),
    document(
      "property_monsoon_logistics_growth_shares",
      "Shareholder Rights Summary",
      "Governance",
      "legal",
    ),
    document(
      "property_monsoon_logistics_growth_shares",
      "Growth Round Memo",
      "Issuer deck",
      "issuer",
    ),
    document("property_monsoon_logistics_growth_shares", "Financial Snapshot", "Financials", "compliance"),
    document("property_pune_logistics_land_parcel", "Project Teaser", "Marketing", "issuer", "pending"),
    document("property_pune_logistics_land_parcel", "Land Due Diligence", "Legal", "legal", "pending"),
  ];

  return {
    seededAt: nowIso(),
    platformTreasuryInrMinor: 1_75_000,
    config: {
      primaryFeeBps: 100,
      secondaryFeeBps: 50,
    },
    users,
    sessions: [],
    kycRecords,
    properties,
    propertyDocuments,
    verificationRequests: [],
    holdings,
    orders: [
      {
        id: "order_seed_alpha_primary",
        kind: "primary",
        propertyId: "property_whitefield_income_commons",
        buyerId: "user_investor_alpha",
        sellerId: null,
        listingId: null,
        units: 120,
        pricePerUnitInrMinor: 25_000,
        grossAmountInrMinor: 30_00_000,
        feeAmountInrMinor: 30_000,
        status: "settled",
        paymentId: "payment_seed_alpha_primary",
        createdAt: nowIso(),
        settledAt: nowIso(),
        settlementSignature: null,
        onChainTradeAddress: null,
      },
      {
        id: "order_seed_beta_primary",
        kind: "primary",
        propertyId: "property_whitefield_income_commons",
        buyerId: "user_investor_beta",
        sellerId: null,
        listingId: null,
        units: 100,
        pricePerUnitInrMinor: 25_000,
        grossAmountInrMinor: 25_00_000,
        feeAmountInrMinor: 25_000,
        status: "settled",
        paymentId: "payment_seed_beta_primary",
        createdAt: nowIso(),
        settledAt: nowIso(),
        settlementSignature: null,
        onChainTradeAddress: null,
      },
      {
        id: "order_seed_alpha_company_primary",
        kind: "primary",
        propertyId: "property_monsoon_logistics_growth_shares",
        buyerId: "user_investor_alpha",
        sellerId: null,
        listingId: null,
        units: 80,
        pricePerUnitInrMinor: 15_000,
        grossAmountInrMinor: 12_00_000,
        feeAmountInrMinor: 12_000,
        status: "settled",
        paymentId: "payment_seed_alpha_company_primary",
        createdAt: nowIso(),
        settledAt: nowIso(),
        settlementSignature: null,
        onChainTradeAddress: null,
      },
      {
        id: "order_seed_beta_company_primary",
        kind: "primary",
        propertyId: "property_monsoon_logistics_growth_shares",
        buyerId: "user_investor_beta",
        sellerId: null,
        listingId: null,
        units: 40,
        pricePerUnitInrMinor: 15_000,
        grossAmountInrMinor: 6_00_000,
        feeAmountInrMinor: 6_000,
        status: "settled",
        paymentId: "payment_seed_beta_company_primary",
        createdAt: nowIso(),
        settledAt: nowIso(),
        settlementSignature: null,
        onChainTradeAddress: null,
      },
      {
        id: "order_seed_beta_pending_primary",
        kind: "primary",
        propertyId: "property_monsoon_logistics_growth_shares",
        buyerId: "user_investor_beta",
        sellerId: null,
        listingId: null,
        units: 25,
        pricePerUnitInrMinor: 15_000,
        grossAmountInrMinor: 3_75_000,
        feeAmountInrMinor: 3_750,
        status: "awaiting_payment",
        paymentId: "payment_seed_beta_pending_primary",
        createdAt: plusDays(-1),
        settledAt: null,
        settlementSignature: null,
        onChainTradeAddress: null,
      },
    ],
    payments: [
      {
        id: "payment_seed_alpha_primary",
        orderId: "order_seed_alpha_primary",
        userId: "user_investor_alpha",
        amountInrMinor: 30_00_000,
        method: "mock_upi",
        status: "settled",
        reference: "UPI-SEED-ALPHA",
        createdAt: nowIso(),
        settledAt: nowIso(),
      },
      {
        id: "payment_seed_beta_primary",
        orderId: "order_seed_beta_primary",
        userId: "user_investor_beta",
        amountInrMinor: 25_00_000,
        method: "mock_upi",
        status: "settled",
        reference: "UPI-SEED-BETA",
        createdAt: nowIso(),
        settledAt: nowIso(),
      },
      {
        id: "payment_seed_alpha_company_primary",
        orderId: "order_seed_alpha_company_primary",
        userId: "user_investor_alpha",
        amountInrMinor: 12_00_000,
        method: "mock_upi",
        status: "settled",
        reference: "UPI-SEED-COMPANY-A",
        createdAt: nowIso(),
        settledAt: nowIso(),
      },
      {
        id: "payment_seed_beta_company_primary",
        orderId: "order_seed_beta_company_primary",
        userId: "user_investor_beta",
        amountInrMinor: 6_00_000,
        method: "mock_upi",
        status: "settled",
        reference: "UPI-SEED-COMPANY-B",
        createdAt: nowIso(),
        settledAt: nowIso(),
      },
      {
        id: "payment_seed_beta_pending_primary",
        orderId: "order_seed_beta_pending_primary",
        userId: "user_investor_beta",
        amountInrMinor: 3_75_000,
        method: "mock_upi",
        status: "pending",
        reference: "UPI-DEMO-BETA",
        createdAt: plusDays(-1),
        settledAt: null,
      },
    ],
    listings: [
      {
        id: listingId,
        propertyId: "property_whitefield_income_commons",
        sellerId: "user_investor_alpha",
        sequenceId: null,
        unitsListed: 20,
        unitsRemaining: 20,
        pricePerUnitInrMinor: 27_500,
        status: "active",
        createdAt: nowIso(),
        updatedAt: nowIso(),
        onChainAddress: null,
        creationSignature: null,
        cancelSignature: null,
      },
      {
        id: "listing_monsoon_beta",
        propertyId: "property_monsoon_logistics_growth_shares",
        sellerId: "user_investor_beta",
        sequenceId: null,
        unitsListed: 10,
        unitsRemaining: 10,
        pricePerUnitInrMinor: 18_000,
        status: "active",
        createdAt: nowIso(),
        updatedAt: nowIso(),
        onChainAddress: null,
        creationSignature: null,
        cancelSignature: null,
      },
    ],
    trades: [],
    distributions: [
      {
        id: "distribution_alpha_whitefield_q1",
        propertyId: "property_whitefield_income_commons",
        userId: "user_investor_alpha",
        amountInrMinor: 36_000,
        status: "paid",
        announcedAt: plusDays(-30),
        payableAt: plusDays(-25),
      },
      {
        id: "distribution_beta_whitefield_q1",
        propertyId: "property_whitefield_income_commons",
        userId: "user_investor_beta",
        amountInrMinor: 30_000,
        status: "paid",
        announcedAt: plusDays(-30),
        payableAt: plusDays(-25),
      },
    ],
    notifications: [
      notification(
        "user_issuer",
        "Two secondary listings are live",
        "Rohan Shah listed Whitefield units and Ananya Rao listed Monsoon Logistics shares on the local market.",
      ),
      notification(
        "user_admin",
        "One asset needs review",
        "Pune Logistics Land Parcel is waiting for compliance review and publish approval.",
      ),
      notification(
        "user_investor_beta",
        "One payment is ready",
        "A Monsoon Logistics top-up order is waiting in Payments so you can show settlement instantly during the demo.",
      ),
    ],
    jobs: [queueJob("settle_primary_order", { orderId: "noop", paymentId: "noop" }, 60_000)],
  };
};

const ensureStorageDir = () => {
  if (!existsSync(STORAGE_DIR)) {
    mkdirSync(STORAGE_DIR, { recursive: true });
  }
};

const ensureVerificationUploadDir = (requestId?: string) => {
  const target = requestId ? path.join(VERIFICATION_UPLOAD_DIR, requestId) : VERIFICATION_UPLOAD_DIR;
  if (!existsSync(target)) {
    mkdirSync(target, { recursive: true });
  }

  return target;
};

const ensurePropertyDocumentUploadDir = (propertyId?: string) => {
  const target = propertyId
    ? path.join(PROPERTY_DOCUMENT_UPLOAD_DIR, propertyId)
    : PROPERTY_DOCUMENT_UPLOAD_DIR;
  if (!existsSync(target)) {
    mkdirSync(target, { recursive: true });
  }

  return target;
};

const sanitizeFileName = (value: string) => {
  const normalized = path
    .basename(value)
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return normalized || "document";
};

const normalizeState = (state: LocalState): LocalState => ({
  ...state,
  users: state.users.map((value) => ({
    ...value,
    managedWalletAddress: getManagedWalletAddress(value.id),
  })),
  propertyDocuments: state.propertyDocuments.map((value) => ({
    ...value,
    mimeType: value.mimeType ?? undefined,
    sizeBytes: value.sizeBytes ?? undefined,
    uploadedAt: value.uploadedAt ?? undefined,
    storagePath: value.storagePath ?? undefined,
  })),
  properties: state.properties.map((value) => ({
    ...value,
    slug: value.slug || slugify(value.name),
    code: value.code || makePropertyCode(value.symbol, value.slug || value.name),
    onChainPropertyAddress: value.onChainPropertyAddress ?? null,
    onChainOfferingAddress: value.onChainOfferingAddress ?? null,
    submissionSignature: value.submissionSignature ?? null,
    approvalSignature: value.approvalSignature ?? null,
    publicationSignature: value.publicationSignature ?? null,
    lastChainSyncAt: value.lastChainSyncAt ?? null,
  })),
  verificationRequests: (state.verificationRequests ?? []).map((value): VerificationRequest => ({
    ...value,
    assetCategory: value.assetCategory ?? null,
    ownerNote: value.ownerNote ?? null,
    reviewerNote: value.reviewerNote ?? null,
    reviewedAt: value.reviewedAt ?? null,
    reviewerId: value.reviewerId ?? null,
    attachments: (value.attachments ?? []).map((attachment) => ({
      ...attachment,
      storagePath: attachment.storagePath ?? "",
    })),
  })),
  holdings: state.holdings.map((value) => ({
    ...value,
    onChainAddress: value.onChainAddress ?? null,
  })),
  orders: state.orders.map((value) => ({
    ...value,
    settlementSignature: value.settlementSignature ?? null,
    onChainTradeAddress: value.onChainTradeAddress ?? null,
  })),
  payments: state.payments.map((value) => ({
    ...value,
    paymentSignature: value.paymentSignature ?? null,
    paymentWalletAddress: value.paymentWalletAddress ?? null,
    paymentLamports: value.paymentLamports ?? null,
    pricingSnapshotInrPerSolMinor: value.pricingSnapshotInrPerSolMinor ?? null,
  })),
  listings: state.listings.map((value) => ({
    ...value,
    sequenceId: value.sequenceId ?? null,
    onChainAddress: value.onChainAddress ?? null,
    creationSignature: value.creationSignature ?? null,
    cancelSignature: value.cancelSignature ?? null,
  })),
  trades: state.trades.map((value) => ({
    ...value,
    sequenceId: value.sequenceId ?? null,
    buyerWalletAddress: value.buyerWalletAddress ?? null,
    sellerWalletAddress: value.sellerWalletAddress ?? null,
    onChainAddress: value.onChainAddress ?? null,
    settlementSignature: value.settlementSignature ?? null,
  })),
  jobs: state.jobs.map((value) => ({
    ...value,
    transactionSignature: value.transactionSignature ?? null,
  })),
});

const backfillSeedPropertyDocuments = (state: LocalState): LocalState => ({
  ...state,
  propertyDocuments: state.propertyDocuments.map((value) => {
    const assetFileName = getSeedPropertyDocumentAssetFileName(value.propertyId, value.name);
    if (!assetFileName) {
      return value;
    }

    const expectedUrl = buildPropertyDocumentUrl(value.id);
    const hasFile = hasSeededPropertyDocumentFile(value.storagePath);
    const seededFile = hasFile
      ? null
      : materializeSeedPropertyDocumentFile({
          id: value.id,
          propertyId: value.propertyId,
          name: value.name,
          updatedAt: value.updatedAt,
        });

    return {
      ...value,
      url: expectedUrl,
      mimeType: value.mimeType ?? seededFile?.mimeType ?? inferSeedPropertyDocumentMimeType(assetFileName),
      sizeBytes: value.sizeBytes ?? seededFile?.sizeBytes,
      uploadedAt: value.uploadedAt ?? seededFile?.uploadedAt ?? value.updatedAt,
      storagePath: hasFile ? value.storagePath : seededFile?.storagePath ?? value.storagePath,
    };
  }),
});

const hydrateAuthState = (state: LocalState): LocalState => {
  const authSnapshot = loadAuthSnapshot();
  if (authSnapshot.users.length === 0 && authSnapshot.sessions.length === 0) {
    return state;
  }

  const usersById = new Map(state.users.map((value) => [value.id, value]));
  const mergedUsers = [...state.users];
  let usersChanged = false;

  for (const authUser of authSnapshot.users) {
    const existingUser = usersById.get(authUser.id);
    if (!existingUser) {
      mergedUsers.push(authUser);
      usersById.set(authUser.id, authUser);
      usersChanged = true;

      if (!state.kycRecords.some((value) => value.userId === authUser.id)) {
        state.kycRecords.push(
          kyc(
            authUser.id,
            authUser.kycStatus,
            "",
            "",
            "",
            "",
            "SQLite-restored auth account awaiting KYC sync",
          ),
        );
      }
      continue;
    }

    const mergedUser = {
      ...existingUser,
      ...authUser,
      managedWalletAddress: authUser.managedWalletAddress,
    };

    if (JSON.stringify(existingUser) !== JSON.stringify(mergedUser)) {
      const index = mergedUsers.findIndex((value) => value.id === authUser.id);
      mergedUsers[index] = mergedUser;
      usersChanged = true;
    }
  }

  const mergedSessions = authSnapshot.sessions.filter((value) => usersById.has(value.userId));
  const sessionsChanged = JSON.stringify(state.sessions) !== JSON.stringify(mergedSessions);

  if (!usersChanged && !sessionsChanged) {
    return state;
  }

  return {
    ...state,
    users: mergedUsers,
    sessions: mergedSessions,
  };
};

export const ensureStateFile = () => {
  ensureStorageDir();
  ensureAuthStore();
  const authSnapshot = loadAuthSnapshot();

  if (!existsSync(STATE_PATH)) {
    const seedState = normalizeState(createSeedState());
    writeFileSync(STATE_PATH, JSON.stringify(seedState, null, 2));

    if (authSnapshot.users.length === 0 && authSnapshot.sessions.length === 0) {
      replaceAuthSnapshot(seedState.users, seedState.sessions);
    }

    return;
  }

  if (authSnapshot.users.length === 0 && authSnapshot.sessions.length === 0) {
    const parsed = JSON.parse(readFileSync(STATE_PATH, "utf8")) as LocalState;
    const normalized = normalizeState(parsed);
    replaceAuthSnapshot(normalized.users, normalized.sessions);
  }
};

export const readState = (): LocalState => {
  ensureStateFile();
  const parsed = JSON.parse(readFileSync(STATE_PATH, "utf8")) as LocalState;
  const normalized = backfillSeedPropertyDocuments(hydrateAuthState(normalizeState(parsed)));

  if (JSON.stringify(parsed) !== JSON.stringify(normalized)) {
    writeState(normalized);
  }

  return normalized;
};

export const writeState = (state: LocalState) => {
  ensureStorageDir();
  ensureAuthStore();
  const normalized = normalizeState(state);
  const tempPath = `${STATE_PATH}.tmp`;
  writeFileSync(tempPath, JSON.stringify(normalized, null, 2));
  renameSync(tempPath, STATE_PATH);
  replaceAuthSnapshot(normalized.users, normalized.sessions);
};

export const mutateState = <T>(mutator: (state: LocalState) => T): T => {
  const state = readState();
  const result = mutator(state);
  writeState(state);
  return result;
};

export const resetState = () => {
  rmSync(UPLOADS_DIR, { recursive: true, force: true });
  writeState(normalizeState(createSeedState()));
};

export const toPublicUser = (value: User): PublicUser => ({
  id: value.id,
  role: value.role,
  fullName: value.fullName,
  email: value.email,
  phone: value.phone,
  city: value.city,
  managedWalletAddress: value.managedWalletAddress,
  externalWalletAddress: value.externalWalletAddress,
  kycStatus: value.kycStatus,
  cashBalanceInrMinor: value.cashBalanceInrMinor,
});

export const getUserByToken = (state: LocalState, token: string | null) => {
  if (!token) {
    return null;
  }

  const session = state.sessions.find((value) => value.token === token);
  if (!session) {
    return null;
  }

  if (Date.parse(session.expiresAt) < Date.now()) {
    return null;
  }

  const currentUser = state.users.find((value) => value.id === session.userId);
  if (!currentUser) {
    return null;
  }

  return {
    session,
    user: currentUser,
  };
};

export const getPropertyDocuments = (state: LocalState, propertyId: string) =>
  state.propertyDocuments.filter((value) => value.propertyId === propertyId);

export const getPropertyById = (state: LocalState, propertyId: string) =>
  state.properties.find((value) => value.id === propertyId) ?? null;

export const getHolding = (state: LocalState, userId: string, propertyId: string) =>
  state.holdings.find((value) => value.userId === userId && value.propertyId === propertyId) ?? null;

export const getAvailableUnitsForListing = (state: LocalState, userId: string, propertyId: string) => {
  const currentHolding = getHolding(state, userId, propertyId);
  if (!currentHolding) {
    return 0;
  }

  const committedUnits = state.listings
    .filter(
      (value) =>
        value.sellerId === userId &&
        value.propertyId === propertyId &&
        (value.status === "active" || value.status === "partially_filled"),
    )
    .reduce((sum, value) => sum + value.unitsRemaining, 0);

  return currentHolding.units - committedUnits;
};

export const enqueueJob = (
  state: LocalState,
  type: QueueJob["type"],
  payload: QueueJob["payload"],
  delayMs = 0,
) => {
  const job = queueJob(type, payload, delayMs);
  state.jobs.push(job);
  return job;
};

export const addNotification = (state: LocalState, userId: string, title: string, body: string) => {
  const value = notification(userId, title, body);
  state.notifications.unshift(value);
  return value;
};

export const createRegisteredInvestor = (
  state: LocalState,
  fullName: string,
  email: string,
): User => {
  const existingUser = state.users.find((value) => value.email.toLowerCase() === email.toLowerCase());
  if (existingUser) {
    return existingUser;
  }

  const userId = makeId("user");
  const account = user(
    userId,
    "investor",
    fullName.trim(),
    email.trim().toLowerCase(),
    "",
    "Unspecified",
    getManagedWalletAddress(userId),
    "not_started",
    0,
  );

  state.users.push(account);
  state.kycRecords.push(
    kyc(userId, "not_started", "", "", "", "", "Self-registered account awaiting KYC"),
  );

  return account;
};

export const listDemoUsers = (state: LocalState) =>
  state.users
    .filter((value) => value.email.endsWith("@eternal.local"))
    .map((value) => ({
      identifier: value.email,
      fullName: value.fullName,
      role: value.role,
      phone: value.phone,
      kycStatus: value.kycStatus,
    }));

export const writeVerificationAttachmentFile = (
  requestId: string,
  attachmentId: string,
  fileName: string,
  bytes: Uint8Array,
) => {
  ensureStorageDir();
  ensureVerificationUploadDir(requestId);

  const storedFileName = `${attachmentId}-${sanitizeFileName(fileName)}`;
  const relativePath = path.join("verification", requestId, storedFileName);
  writeFileSync(path.join(UPLOADS_DIR, relativePath), bytes);

  return relativePath;
};

export const writePropertyDocumentFile = (
  propertyId: string,
  documentId: string,
  fileName: string,
  bytes: Uint8Array,
) => {
  ensureStorageDir();
  ensurePropertyDocumentUploadDir(propertyId);

  const storedFileName = `${documentId}-${sanitizeFileName(fileName)}`;
  const relativePath = path.join("property-documents", propertyId, storedFileName);
  writeFileSync(path.join(UPLOADS_DIR, relativePath), bytes);

  return relativePath;
};

export const getVerificationAttachmentAbsolutePath = (storagePath: string) => {
  const absolutePath = path.resolve(UPLOADS_DIR, storagePath);
  if (!absolutePath.startsWith(UPLOADS_DIR)) {
    throw new Error("Invalid verification attachment path.");
  }

  return absolutePath;
};

export const getPropertyDocumentAbsolutePath = (storagePath: string) => {
  const absolutePath = path.resolve(UPLOADS_DIR, storagePath);
  if (!absolutePath.startsWith(UPLOADS_DIR)) {
    throw new Error("Invalid property document path.");
  }

  return absolutePath;
};

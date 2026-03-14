export type UserRole = "admin" | "issuer" | "investor";

export type KycStatus = "not_started" | "pending" | "approved" | "rejected";

export type AssetClass = "real_estate" | "company_share";

export type PropertyStatus =
  | "draft"
  | "review"
  | "approved"
  | "live"
  | "closed"
  | "rejected";

export type OrderStatus =
  | "awaiting_payment"
  | "settlement_pending"
  | "settled"
  | "cancelled"
  | "failed";

export type PaymentStatus = "pending" | "paid" | "settled" | "failed";
export type PaymentMethod = "mock_upi" | "solana_localnet";

export type ListingStatus = "active" | "partially_filled" | "filled" | "cancelled";

export interface SessionUser {
  id: string;
  role: UserRole;
  fullName: string;
  email: string;
  phone: string;
  city: string;
  managedWalletAddress: string;
  externalWalletAddress: string | null;
  kycStatus: KycStatus;
  cashBalanceInrMinor: number;
}

export interface DemoUser {
  identifier: string;
  fullName: string;
  role: UserRole;
  phone: string;
  kycStatus: KycStatus;
}

export interface PropertySummary {
  id: string;
  slug: string;
  issuerId: string;
  code: string;
  issuerName: string;
  name: string;
  assetClass: AssetClass;
  assetClassLabel: string;
  assetType: string;
  symbol: string;
  city: string;
  state: string;
  marketSegment: string;
  marketSegmentLabel: string;
  summary: string;
  heroTag: string;
  riskBand: "Core" | "Core Plus" | "Growth";
  registrationRef: string;
  registrationLabel: string;
  structureName: string;
  structureType: string;
  structureLabel: string;
  targetYieldBps: number;
  targetIrrBps: number;
  expectedExitMonths: number;
  minimumInvestmentInrMinor: number;
  unitPriceInrMinor: number;
  totalUnits: number;
  availableUnits: number;
  fundedUnits: number;
  status: PropertyStatus;
  createdAt: string;
  approvedAt: string | null;
  liveAt: string | null;
  onChainPropertyAddress: string | null;
  onChainOfferingAddress: string | null;
  submissionSignature: string | null;
  approvalSignature: string | null;
  publicationSignature: string | null;
  lastChainSyncAt: string | null;
  fundedPercent: number;
  activeListingCount: number;
  activeListingUnits: number;
  documentCount: number;
}

export interface PropertyDocument {
  id: string;
  propertyId: string;
  name: string;
  category: string;
  status: "approved" | "pending";
  source: "issuer" | "legal" | "compliance";
  url: string;
  updatedAt: string;
  mimeType?: string;
  sizeBytes?: number;
  uploadedAt?: string;
  storagePath?: string;
  property?: PropertySummary;
}

export interface Listing {
  id: string;
  propertyId: string;
  sellerId: string;
  sellerName?: string;
  sequenceId: number | null;
  unitsListed: number;
  unitsRemaining: number;
  pricePerUnitInrMinor: number;
  status: ListingStatus;
  createdAt: string;
  updatedAt: string;
  onChainAddress: string | null;
  creationSignature: string | null;
  cancelSignature: string | null;
  property?: PropertySummary;
}

export interface Trade {
  id: string;
  listingId: string;
  propertyId: string;
  sequenceId: number | null;
  buyerId: string;
  sellerId: string;
  buyerName?: string;
  sellerName?: string;
  units: number;
  pricePerUnitInrMinor: number;
  totalAmountInrMinor: number;
  status: "settled" | "cancelled";
  createdAt: string;
  settledAt: string;
  buyerWalletAddress: string | null;
  sellerWalletAddress: string | null;
  onChainAddress: string | null;
  settlementSignature: string | null;
}

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  body: string;
  createdAt: string;
  readAt: string | null;
}

export interface DashboardResponse {
  user: SessionUser;
  stats: {
    activeOrders: number;
    settledOrders: number;
    holdings: number;
    activeListings: number;
    cashBalanceInrMinor: number;
  };
  nextSteps: string[];
  featuredProperties: PropertySummary[];
  notifications: NotificationItem[];
}

export interface Holding {
  id: string;
  userId: string;
  propertyId: string;
  units: number;
  averagePriceInrMinor: number;
  investedAmountInrMinor: number;
  createdAt: string;
  updatedAt: string;
  onChainAddress: string | null;
  property: PropertySummary;
  marketValueInrMinor: number;
  listedUnits: number;
}

export interface Distribution {
  id: string;
  propertyId: string;
  userId: string;
  amountInrMinor: number;
  status: "announced" | "paid";
  announcedAt: string;
  payableAt: string;
  property: PropertySummary;
}

export interface PaymentIntent {
  id: string;
  orderId: string;
  userId: string;
  amountInrMinor: number;
  method: PaymentMethod;
  status: PaymentStatus;
  reference: string;
  createdAt: string;
  settledAt: string | null;
  paymentSignature: string | null;
  paymentWalletAddress: string | null;
  paymentLamports: number | null;
  pricingSnapshotInrPerSolMinor: number | null;
  solanaQuote?: SolanaQuote;
}

export interface SolanaQuote {
  amountInrMinor: number;
  amountLamports: number;
  amountSol: number;
  inrPerSolMinor: number;
  source: "static_demo_quote";
  available: boolean;
  unavailableReason: string | null;
  recipients: SolanaQuoteRecipient[];
}

export interface SolanaQuoteRecipient {
  role: "issuer" | "seller" | "platform_fee";
  label: string;
  address: string;
  amountInrMinor: number;
  amountLamports: number;
  amountSol: number;
}

export interface SolanaPaymentConfig {
  enabled: boolean;
  treasuryAddress: string | null;
  inrPerSolMinor: number;
  source: "static_demo_quote";
}

export interface OrderBase {
  id: string;
  kind: "primary" | "secondary";
  propertyId: string;
  buyerId: string;
  sellerId: string | null;
  listingId: string | null;
  units: number;
  pricePerUnitInrMinor: number;
  grossAmountInrMinor: number;
  feeAmountInrMinor: number;
  status: OrderStatus;
  paymentId: string;
  createdAt: string;
  settledAt: string | null;
  settlementSignature: string | null;
  onChainTradeAddress: string | null;
}

export interface OrderRecord extends OrderBase {
  property: PropertySummary;
  payment: PaymentIntent | null;
}

export interface PaymentRecord extends PaymentIntent {
  order: OrderBase;
  property: PropertySummary;
}

export interface PortfolioResponse {
  holdings: Holding[];
  listings: Listing[];
  distributions: Distribution[];
}

export interface OrdersResponse {
  orders: OrderRecord[];
}

export interface PaymentsResponse {
  cashBalanceInrMinor: number;
  payments: PaymentRecord[];
  solanaPaymentConfig: SolanaPaymentConfig;
}

export interface DocumentsResponse {
  kycRecord: KycRecord | null;
  propertyDocuments: PropertyDocument[];
}

export interface PropertyDetailResponse {
  property: PropertySummary;
  documents: PropertyDocument[];
  listings: Listing[];
  trades: Trade[];
}

export interface KycRecord {
  id: string;
  userId: string;
  status: KycStatus;
  panMasked: string;
  aadhaarMasked: string;
  occupation: string;
  annualIncomeBand: string;
  notes: string;
  submittedAt: string | null;
  reviewedAt: string | null;
  reviewerId: string | null;
}

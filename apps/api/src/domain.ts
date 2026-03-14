export type UserRole = "admin" | "issuer" | "investor";

export type KycStatus = "not_started" | "pending" | "approved" | "rejected";

export type VerificationRequestStatus = "pending" | "approved" | "rejected";

export type AssetClass = "real_estate" | "company_share";

export type PropertyStatus =
  | "draft"
  | "review"
  | "approved"
  | "live"
  | "closed"
  | "rejected";

export type OrderKind = "primary" | "secondary";

export type OrderStatus =
  | "awaiting_payment"
  | "settlement_pending"
  | "settled"
  | "cancelled"
  | "failed";

export type PaymentStatus = "pending" | "paid" | "settled" | "failed";
export type PaymentMethod = "mock_upi" | "solana_localnet";

export type ListingStatus = "active" | "partially_filled" | "filled" | "cancelled";

export type TradeStatus = "settled" | "cancelled";

export type DistributionStatus = "announced" | "paid";

export type JobType = "settle_primary_order" | "settle_secondary_trade";

export type JobStatus = "queued" | "processing" | "completed" | "failed";

export interface User {
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
  otpCode?: string;
  createdAt: string;
}

export interface Session {
  token: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
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
}

export interface VerificationAttachment {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
  storagePath: string;
}

export interface VerificationRequest {
  id: string;
  ownerUserId: string;
  issuerId: string;
  assetName: string;
  assetCategory: string | null;
  ownerNote: string | null;
  reviewerNote: string | null;
  status: VerificationRequestStatus;
  submittedAt: string;
  reviewedAt: string | null;
  reviewerId: string | null;
  attachments: VerificationAttachment[];
}

export interface PropertyProject {
  id: string;
  slug: string;
  issuerId: string;
  code: string;
  name: string;
  assetClass: AssetClass;
  assetType: string;
  symbol: string;
  city: string;
  state: string;
  marketSegment: string;
  summary: string;
  heroTag: string;
  riskBand: "Core" | "Core Plus" | "Growth";
  registrationRef: string;
  structureName: string;
  structureType: string;
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
}

export interface Order {
  id: string;
  kind: OrderKind;
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
}

export interface Listing {
  id: string;
  propertyId: string;
  sellerId: string;
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
}

export interface Trade {
  id: string;
  listingId: string;
  propertyId: string;
  sequenceId: number | null;
  buyerId: string;
  sellerId: string;
  units: number;
  pricePerUnitInrMinor: number;
  totalAmountInrMinor: number;
  status: TradeStatus;
  createdAt: string;
  settledAt: string;
  buyerWalletAddress: string | null;
  sellerWalletAddress: string | null;
  onChainAddress: string | null;
  settlementSignature: string | null;
}

export interface Distribution {
  id: string;
  propertyId: string;
  userId: string;
  amountInrMinor: number;
  status: DistributionStatus;
  announcedAt: string;
  payableAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  body: string;
  createdAt: string;
  readAt: string | null;
}

export interface QueueJob {
  id: string;
  type: JobType;
  status: JobStatus;
  payload: Record<string, string | number>;
  attempts: number;
  createdAt: string;
  availableAt: string;
  completedAt: string | null;
  lastError: string | null;
  transactionSignature: string | null;
}

export interface LocalState {
  seededAt: string;
  platformTreasuryInrMinor: number;
  config: {
    primaryFeeBps: number;
    secondaryFeeBps: number;
  };
  users: User[];
  sessions: Session[];
  kycRecords: KycRecord[];
  properties: PropertyProject[];
  propertyDocuments: PropertyDocument[];
  verificationRequests: VerificationRequest[];
  holdings: Holding[];
  orders: Order[];
  payments: PaymentIntent[];
  listings: Listing[];
  trades: Trade[];
  distributions: Distribution[];
  notifications: Notification[];
  jobs: QueueJob[];
}

export interface PublicUser {
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

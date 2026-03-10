import { PublicKey } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';

// ============================================
// Enums
// ============================================

export enum AssetType {
  RealEstate = 0,
  Gold = 1,
  Infrastructure = 2,
  Vehicle = 3,
  Art = 4,
  Commodity = 5,
  Other = 6,
}

export enum AssetStatus {
  Pending = 0,
  Verified = 1,
  Tokenized = 2,
  Frozen = 3,
  Delisted = 4,
}

// ============================================
// Account Types
// ============================================

export interface PlatformConfig {
  authority: PublicKey;
  treasury: PublicKey;
  registrationFee: BN;
  mintingFeeBps: number;
  tradingFeeBps: number;
  minValuation: BN;
  maxFractions: BN;
  minFractions: BN;
  totalAssets: BN;
  totalVolume: BN;
  paused: boolean;
  bump: number;
}

export interface Asset {
  owner: PublicKey;
  assetType: AssetType;
  status: AssetStatus;
  tokenMint: PublicKey;
  valuation: BN;
  totalFractions: BN;
  availableFractions: BN;
  pricePerFraction: BN;
  metadataUri: string;
  documentsUri: string;
  documentHash: number[];
  location: string;
  createdAt: BN;
  updatedAt: BN;
  assetId: string;
  bump: number;
}

export interface Ownership {
  asset: PublicKey;
  owner: PublicKey;
  fractionsOwned: BN;
  purchasedAt: BN;
  bump: number;
}

export interface Document {
  asset: PublicKey;
  docType: string;
  uri: string;
  hash: number[];
  verified: boolean;
  verifier: PublicKey | null;
  uploadedAt: BN;
  verifiedAt: BN | null;
  bump: number;
}

// ============================================
// Instruction Parameter Types
// ============================================

export interface InitializePlatformParams {
  registrationFee: BN | null;
  mintingFeeBps: number | null;
  tradingFeeBps: number | null;
}

export interface RegisterAssetParams {
  assetId: string;
  assetType: number;
  valuation: BN;
  totalFractions: BN;
  metadataUri: string;
  documentsUri: string;
  location: string;
  documentHash: number[];
}

export interface TokenizeAssetParams {
  name: string;
  symbol: string;
  uri: string;
}

export interface BuyFractionsParams {
  fractionsToBuy: BN;
}

export interface SellFractionsParams {
  fractionsToSell: BN;
}

export interface AddDocumentParams {
  docType: string;
  uri: string;
  hash: number[];
}

export interface UpdateAssetParams {
  newValuation: BN | null;
  newMetadataUri: string | null;
  newDocumentsUri: string | null;
}

export interface TransferOwnershipParams {
  fractionsToTransfer: BN;
}

// ============================================
// IDL Type Definition
// ============================================

export type AssetTokenization = {
  "version": "0.1.0",
  "name": "asset_tokenization",
  "instructions": [
    {
      "name": "initializePlatform",
      "accounts": [
        { "name": "authority", "isMut": true, "isSigner": true },
        { "name": "platformConfig", "isMut": true, "isSigner": false },
        { "name": "treasury", "isMut": false, "isSigner": false },
        { "name": "systemProgram", "isMut": false, "isSigner": false }
      ],
      "args": [
        { "name": "registrationFee", "type": { "option": "u64" } },
        { "name": "mintingFeeBps", "type": { "option": "u16" } },
        { "name": "tradingFeeBps", "type": { "option": "u16" } }
      ]
    },
    {
      "name": "registerAsset",
      "accounts": [
        { "name": "owner", "isMut": true, "isSigner": true },
        { "name": "platformConfig", "isMut": true, "isSigner": false },
        { "name": "asset", "isMut": true, "isSigner": false },
        { "name": "treasury", "isMut": true, "isSigner": false },
        { "name": "systemProgram", "isMut": false, "isSigner": false }
      ],
      "args": [
        { "name": "assetId", "type": "string" },
        { "name": "assetType", "type": "u8" },
        { "name": "valuation", "type": "u64" },
        { "name": "totalFractions", "type": "u64" },
        { "name": "metadataUri", "type": "string" },
        { "name": "documentsUri", "type": "string" },
        { "name": "location", "type": "string" },
        { "name": "documentHash", "type": { "array": ["u8", 32] } }
      ]
    },
    {
      "name": "verifyAsset",
      "accounts": [
        { "name": "authority", "isMut": false, "isSigner": true },
        { "name": "platformConfig", "isMut": false, "isSigner": false },
        { "name": "asset", "isMut": true, "isSigner": false }
      ],
      "args": []
    },
    {
      "name": "tokenizeAsset",
      "accounts": [
        { "name": "owner", "isMut": true, "isSigner": true },
        { "name": "platformConfig", "isMut": true, "isSigner": false },
        { "name": "asset", "isMut": true, "isSigner": false },
        { "name": "tokenMint", "isMut": true, "isSigner": true },
        { "name": "assetTokenAccount", "isMut": true, "isSigner": false },
        { "name": "metadataAccount", "isMut": true, "isSigner": false },
        { "name": "tokenMetadataProgram", "isMut": false, "isSigner": false },
        { "name": "tokenProgram", "isMut": false, "isSigner": false },
        { "name": "associatedTokenProgram", "isMut": false, "isSigner": false },
        { "name": "systemProgram", "isMut": false, "isSigner": false },
        { "name": "rent", "isMut": false, "isSigner": false }
      ],
      "args": [
        { "name": "name", "type": "string" },
        { "name": "symbol", "type": "string" },
        { "name": "uri", "type": "string" }
      ]
    },
    {
      "name": "buyFractions",
      "accounts": [
        { "name": "buyer", "isMut": true, "isSigner": true },
        { "name": "platformConfig", "isMut": true, "isSigner": false },
        { "name": "asset", "isMut": true, "isSigner": false },
        { "name": "assetOwner", "isMut": true, "isSigner": false },
        { "name": "assetTokenAccount", "isMut": true, "isSigner": false },
        { "name": "buyerTokenAccount", "isMut": true, "isSigner": false },
        { "name": "tokenMint", "isMut": false, "isSigner": false },
        { "name": "ownership", "isMut": true, "isSigner": false },
        { "name": "treasury", "isMut": true, "isSigner": false },
        { "name": "tokenProgram", "isMut": false, "isSigner": false },
        { "name": "associatedTokenProgram", "isMut": false, "isSigner": false },
        { "name": "systemProgram", "isMut": false, "isSigner": false }
      ],
      "args": [
        { "name": "fractionsToBuy", "type": "u64" }
      ]
    },
    {
      "name": "sellFractions",
      "accounts": [
        { "name": "seller", "isMut": true, "isSigner": true },
        { "name": "platformConfig", "isMut": true, "isSigner": false },
        { "name": "asset", "isMut": true, "isSigner": false },
        { "name": "sellerTokenAccount", "isMut": true, "isSigner": false },
        { "name": "assetTokenAccount", "isMut": true, "isSigner": false },
        { "name": "tokenMint", "isMut": false, "isSigner": false },
        { "name": "ownership", "isMut": true, "isSigner": false },
        { "name": "treasury", "isMut": true, "isSigner": false },
        { "name": "tokenProgram", "isMut": false, "isSigner": false },
        { "name": "systemProgram", "isMut": false, "isSigner": false }
      ],
      "args": [
        { "name": "fractionsToSell", "type": "u64" }
      ]
    },
    {
      "name": "addDocument",
      "accounts": [
        { "name": "owner", "isMut": true, "isSigner": true },
        { "name": "platformConfig", "isMut": false, "isSigner": false },
        { "name": "asset", "isMut": false, "isSigner": false },
        { "name": "document", "isMut": true, "isSigner": false },
        { "name": "systemProgram", "isMut": false, "isSigner": false }
      ],
      "args": [
        { "name": "docType", "type": "string" },
        { "name": "uri", "type": "string" },
        { "name": "hash", "type": { "array": ["u8", 32] } }
      ]
    },
    {
      "name": "updateAsset",
      "accounts": [
        { "name": "owner", "isMut": true, "isSigner": true },
        { "name": "platformConfig", "isMut": false, "isSigner": false },
        { "name": "asset", "isMut": true, "isSigner": false }
      ],
      "args": [
        { "name": "newValuation", "type": { "option": "u64" } },
        { "name": "newMetadataUri", "type": { "option": "string" } },
        { "name": "newDocumentsUri", "type": { "option": "string" } }
      ]
    },
    {
      "name": "transferOwnership",
      "accounts": [
        { "name": "from", "isMut": true, "isSigner": true },
        { "name": "to", "isMut": true, "isSigner": false },
        { "name": "platformConfig", "isMut": false, "isSigner": false },
        { "name": "asset", "isMut": false, "isSigner": false },
        { "name": "fromTokenAccount", "isMut": true, "isSigner": false },
        { "name": "toTokenAccount", "isMut": true, "isSigner": false },
        { "name": "tokenMint", "isMut": false, "isSigner": false },
        { "name": "fromOwnership", "isMut": true, "isSigner": false },
        { "name": "toOwnership", "isMut": true, "isSigner": false },
        { "name": "tokenProgram", "isMut": false, "isSigner": false },
        { "name": "associatedTokenProgram", "isMut": false, "isSigner": false },
        { "name": "systemProgram", "isMut": false, "isSigner": false }
      ],
      "args": [
        { "name": "fractionsToTransfer", "type": "u64" }
      ]
    }
  ],
  "accounts": [
    {
      "name": "PlatformConfig",
      "type": {
        "kind": "struct",
        "fields": [
          { "name": "authority", "type": "publicKey" },
          { "name": "treasury", "type": "publicKey" },
          { "name": "registrationFee", "type": "u64" },
          { "name": "mintingFeeBps", "type": "u16" },
          { "name": "tradingFeeBps", "type": "u16" },
          { "name": "minValuation", "type": "u64" },
          { "name": "maxFractions", "type": "u64" },
          { "name": "minFractions", "type": "u64" },
          { "name": "totalAssets", "type": "u64" },
          { "name": "totalVolume", "type": "u128" },
          { "name": "paused", "type": "bool" },
          { "name": "bump", "type": "u8" }
        ]
      }
    },
    {
      "name": "Asset",
      "type": {
        "kind": "struct",
        "fields": [
          { "name": "owner", "type": "publicKey" },
          { "name": "assetType", "type": { "defined": "AssetType" } },
          { "name": "status", "type": { "defined": "AssetStatus" } },
          { "name": "tokenMint", "type": "publicKey" },
          { "name": "valuation", "type": "u64" },
          { "name": "totalFractions", "type": "u64" },
          { "name": "availableFractions", "type": "u64" },
          { "name": "pricePerFraction", "type": "u64" },
          { "name": "metadataUri", "type": "string" },
          { "name": "documentsUri", "type": "string" },
          { "name": "documentHash", "type": { "array": ["u8", 32] } },
          { "name": "location", "type": "string" },
          { "name": "createdAt", "type": "i64" },
          { "name": "updatedAt", "type": "i64" },
          { "name": "assetId", "type": "string" },
          { "name": "bump", "type": "u8" }
        ]
      }
    },
    {
      "name": "Ownership",
      "type": {
        "kind": "struct",
        "fields": [
          { "name": "asset", "type": "publicKey" },
          { "name": "owner", "type": "publicKey" },
          { "name": "fractionsOwned", "type": "u64" },
          { "name": "purchasedAt", "type": "i64" },
          { "name": "bump", "type": "u8" }
        ]
      }
    },
    {
      "name": "Document",
      "type": {
        "kind": "struct",
        "fields": [
          { "name": "asset", "type": "publicKey" },
          { "name": "docType", "type": "string" },
          { "name": "uri", "type": "string" },
          { "name": "hash", "type": { "array": ["u8", 32] } },
          { "name": "verified", "type": "bool" },
          { "name": "verifier", "type": { "option": "publicKey" } },
          { "name": "uploadedAt", "type": "i64" },
          { "name": "verifiedAt", "type": { "option": "i64" } },
          { "name": "bump", "type": "u8" }
        ]
      }
    }
  ],
  "types": [
    {
      "name": "AssetType",
      "type": {
        "kind": "enum",
        "variants": [
          { "name": "RealEstate" },
          { "name": "Gold" },
          { "name": "Infrastructure" },
          { "name": "Vehicle" },
          { "name": "Art" },
          { "name": "Commodity" },
          { "name": "Other" }
        ]
      }
    },
    {
      "name": "AssetStatus",
      "type": {
        "kind": "enum",
        "variants": [
          { "name": "Pending" },
          { "name": "Verified" },
          { "name": "Tokenized" },
          { "name": "Frozen" },
          { "name": "Delisted" }
        ]
      }
    }
  ],
  "errors": [
    { "code": 6000, "name": "PlatformPaused", "msg": "Platform is currently paused" },
    { "code": 6001, "name": "ValuationTooLow", "msg": "Asset valuation is below minimum threshold" },
    { "code": 6002, "name": "TooManyFractions", "msg": "Number of fractions exceeds maximum allowed" },
    { "code": 6003, "name": "TooFewFractions", "msg": "Number of fractions is below minimum allowed" },
    { "code": 6004, "name": "InvalidAssetStatus", "msg": "Asset is not in the correct status for this operation" },
    { "code": 6005, "name": "AssetNotVerified", "msg": "Asset must be verified before tokenization" },
    { "code": 6006, "name": "AlreadyTokenized", "msg": "Asset is already tokenized" },
    { "code": 6007, "name": "InsufficientFractions", "msg": "Insufficient fractions available" },
    { "code": 6008, "name": "InsufficientPayment", "msg": "Insufficient payment amount" },
    { "code": 6009, "name": "InvalidPriceCalculation", "msg": "Invalid price calculation" },
    { "code": 6010, "name": "Unauthorized", "msg": "Not authorized to perform this action" },
    { "code": 6011, "name": "InvalidDocumentHash", "msg": "Invalid document hash" },
    { "code": 6012, "name": "MetadataUriTooLong", "msg": "Metadata URI too long" },
    { "code": 6013, "name": "DocumentsUriTooLong", "msg": "Documents URI too long" },
    { "code": 6014, "name": "LocationTooLong", "msg": "Location string too long" },
    { "code": 6015, "name": "AssetIdTooLong", "msg": "Asset ID too long" },
    { "code": 6016, "name": "DocTypeTooLong", "msg": "Document type too long" },
    { "code": 6017, "name": "DocUriTooLong", "msg": "Document URI too long" },
    { "code": 6018, "name": "Overflow", "msg": "Numeric overflow occurred" },
    { "code": 6019, "name": "AssetFrozen", "msg": "Asset is frozen and cannot be traded" },
    { "code": 6020, "name": "InsufficientOwnership", "msg": "Cannot sell more fractions than owned" },
    { "code": 6021, "name": "InvalidFractionAmount", "msg": "Invalid fraction amount" }
  ]
};

// ============================================
// Anchor Enum Conversion Helpers
// ============================================
// Anchor v0.28 deserializes Rust enums as objects like { tokenized: {} }
// These helpers normalize them to numeric TypeScript enum values.

const hasEnumVariant = (value: unknown, variant: string): boolean => {
  return typeof value === "object" && value !== null && variant in value;
};

export const parseAssetStatus = (status: unknown): AssetStatus => {
  if (typeof status === 'number') return status;
  if (hasEnumVariant(status, 'pending')) return AssetStatus.Pending;
  if (hasEnumVariant(status, 'verified')) return AssetStatus.Verified;
  if (hasEnumVariant(status, 'tokenized')) return AssetStatus.Tokenized;
  if (hasEnumVariant(status, 'frozen')) return AssetStatus.Frozen;
  if (hasEnumVariant(status, 'delisted')) return AssetStatus.Delisted;
  return AssetStatus.Pending;
};

export const parseAssetType = (type: unknown): AssetType => {
  if (typeof type === 'number') return type;
  if (hasEnumVariant(type, 'realEstate')) return AssetType.RealEstate;
  if (hasEnumVariant(type, 'gold')) return AssetType.Gold;
  if (hasEnumVariant(type, 'infrastructure')) return AssetType.Infrastructure;
  if (hasEnumVariant(type, 'vehicle')) return AssetType.Vehicle;
  if (hasEnumVariant(type, 'art')) return AssetType.Art;
  if (hasEnumVariant(type, 'commodity')) return AssetType.Commodity;
  if (hasEnumVariant(type, 'other')) return AssetType.Other;
  return AssetType.Other;
};

// ============================================
// Helper Functions
// ============================================

export const getAssetTypeName = (type: AssetType): string => {
  const names: Record<AssetType, string> = {
    [AssetType.RealEstate]: "Real Estate",
    [AssetType.Gold]: "Gold",
    [AssetType.Infrastructure]: "Infrastructure",
    [AssetType.Vehicle]: "Vehicle",
    [AssetType.Art]: "Art",
    [AssetType.Commodity]: "Commodity",
    [AssetType.Other]: "Other",
  };
  return names[type] || "Unknown";
};

export const getAssetStatusName = (status: AssetStatus): string => {
  const names: Record<AssetStatus, string> = {
    [AssetStatus.Pending]: "Pending Verification",
    [AssetStatus.Verified]: "Verified",
    [AssetStatus.Tokenized]: "Tokenized",
    [AssetStatus.Frozen]: "Frozen",
    [AssetStatus.Delisted]: "Delisted",
  };
  return names[status] || "Unknown";
};

export const calculateTotalCost = (
  fractions: BN,
  pricePerFraction: BN,
  tradingFeeBps: number
): { totalCost: BN; fee: BN; ownerAmount: BN } => {
  const baseCost = fractions.mul(pricePerFraction);
  const fee = baseCost.mul(new BN(tradingFeeBps)).div(new BN(10000));
  return {
    totalCost: baseCost,
    fee,
    ownerAmount: baseCost.sub(fee),
  };
};

// ============================================
// PDA Derivation Functions
// ============================================

export const derivePlatformConfigPda = (programId: PublicKey): [PublicKey, number] => {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("platform-config")],
    programId
  );
};

export const deriveAssetPda = (
  owner: PublicKey,
  assetId: string,
  programId: PublicKey
): [PublicKey, number] => {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("asset"), owner.toBuffer(), Buffer.from(assetId)],
    programId
  );
};

export const deriveOwnershipPda = (
  asset: PublicKey,
  owner: PublicKey,
  programId: PublicKey
): [PublicKey, number] => {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("ownership"), asset.toBuffer(), owner.toBuffer()],
    programId
  );
};

export const deriveDocumentPda = (
  asset: PublicKey,
  docType: string,
  programId: PublicKey
): [PublicKey, number] => {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("document"), asset.toBuffer(), Buffer.from(docType)],
    programId
  );
};

// Program ID — deployed on Solana devnet.
// If you redeploy, run `anchor keys list` and update this value,
// the `declare_id!()` in lib.rs, and the Anchor.toml entries.
export const ASSET_TOKENIZATION_PROGRAM_ID = new PublicKey(
  "EjLLVvxkMtssALhHv4dvKhkxYJQKGmMUcB38DboGMYtJ"
);

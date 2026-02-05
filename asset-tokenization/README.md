# Asset Tokenization - Solana Smart Contract

A Solana program for tokenizing real-world assets like land, real estate, gold, and infrastructure. This enables fractional ownership and instant transfers of traditionally illiquid assets.

## Problem Statement

In India, most wealth is locked in real estate, gold, and infrastructure, but ownership transfer is slow, costly, and bureaucratic:
- Selling land can take months involving brokers, lawyers, stamp duty offices, and physical registry visits
- Even gifting property to family is a legal nightmare
- While UPI proved that ₹50 can be sent in one second, ₹50 crore worth of assets still move like it's 1995

**We're bringing UPI-like instant transfers to real-world assets.**

## Features

### Asset Management
- **Register Assets**: Tokenize real estate, gold, infrastructure, vehicles, art, and more
- **Document Verification**: Platform authority verifies legal documents
- **Fractionalization**: Divide assets into tradeable token fractions

### Trading
- **Buy Fractions**: Purchase fractional ownership with instant settlement
- **Sell Fractions**: Liquidate your ownership stake
- **Transfer Ownership**: Send fractions to anyone instantly (like UPI for assets)

### Compliance
- **Document Storage**: Store and verify SHA256 hashes of legal documents
- **Platform Governance**: Authority-controlled verification and fee management

## Asset Types Supported

| Type | Code | Description |
|------|------|-------------|
| Real Estate | 0 | Land, buildings, apartments |
| Gold | 1 | Gold bars, coins |
| Infrastructure | 2 | Roads, bridges, power plants |
| Vehicle | 3 | Cars, trucks, machinery |
| Art | 4 | Paintings, sculptures |
| Commodity | 5 | Other commodities |
| Other | 6 | Any other assets |

## Asset Lifecycle

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   REGISTER  │ ──► │   VERIFY    │ ──► │  TOKENIZE   │ ──► │    TRADE    │
│   (Owner)   │     │ (Authority) │     │   (Owner)   │     │  (Anyone)   │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
     │                   │                    │                    │
     ▼                   ▼                    ▼                    ▼
  Pending            Verified            Tokenized          Buy/Sell/Transfer
```

## Instructions

### Platform Setup

```rust
// Initialize platform (once by admin)
initialize_platform(
    registration_fee: Option<u64>,  // Fee to register assets
    minting_fee_bps: Option<u16>,   // Minting fee in basis points
    trading_fee_bps: Option<u16>,   // Trading fee in basis points
)
```

### Asset Owner Instructions

```rust
// Register a new asset
register_asset(
    asset_id: String,           // Unique identifier
    asset_type: u8,             // 0=RealEstate, 1=Gold, etc.
    valuation: u64,             // Total value in lamports
    total_fractions: u64,       // Number of fractions
    metadata_uri: String,       // IPFS/Arweave metadata URI
    documents_uri: String,      // IPFS/Arweave documents URI
    location: String,           // Physical location
    document_hash: [u8; 32],    // SHA256 of primary document
)

// Tokenize after verification
tokenize_asset(
    name: String,   // Token name
    symbol: String, // Token symbol
    uri: String,    // Token metadata URI
)

// Add additional documents
add_document(
    doc_type: String,   // e.g., "title_deed", "survey"
    uri: String,        // Document URI
    hash: [u8; 32],     // Document SHA256 hash
)

// Update asset metadata
update_asset(
    new_valuation: Option<u64>,
    new_metadata_uri: Option<String>,
    new_documents_uri: Option<String>,
)
```

### Trading Instructions

```rust
// Buy fractions of an asset
buy_fractions(fractions_to_buy: u64)

// Sell fractions back
sell_fractions(fractions_to_sell: u64)

// Transfer fractions to another user (instant!)
transfer_ownership(fractions_to_transfer: u64)
```

### Authority Instructions

```rust
// Verify an asset's documents
verify_asset()
```

## Account Structures

### PlatformConfig
- authority: Platform admin
- treasury: Fee collection wallet
- registration_fee: Asset registration fee
- minting_fee_bps / trading_fee_bps: Fee percentages
- min/max_fractions: Fraction limits
- total_assets / total_volume: Platform stats

### Asset
- owner: Asset owner pubkey
- asset_type / status: Asset classification
- token_mint: SPL token for fractions
- valuation / total_fractions / price_per_fraction
- metadata_uri / documents_uri / document_hash
- location / created_at / updated_at

### Ownership
- asset: Asset pubkey
- owner: Owner pubkey
- fractions_owned: Number of fractions held

### Document
- asset: Asset pubkey
- doc_type / uri / hash
- verified / verifier / verified_at

## Building & Testing

```bash
# Build
cd asset-tokenization
anchor build

# Test
anchor test

# Deploy to devnet
anchor deploy --provider.cluster devnet
```

## Configuration

Default values in `state/config.rs`:
- Registration fee: 0.1 SOL
- Minting fee: 1% (100 bps)
- Trading fee: 0.5% (50 bps)
- Min valuation: 1 SOL
- Min fractions: 100
- Max fractions: 1 billion

## Security Considerations

1. **init-if-needed**: Used carefully for ATA creation; ownership accounts are seeded by asset + owner
2. **Authority controls**: Document verification requires platform authority signature
3. **Status checks**: Assets must follow proper lifecycle (Pending → Verified → Tokenized)
4. **Overflow protection**: All arithmetic uses checked operations

## Program ID

- Localnet/Devnet: `Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS`

> **Note**: Generate a new keypair for production deployment:
> ```bash
> solana-keygen new -o target/deploy/asset_tokenization-keypair.json
> ```

## License

MIT

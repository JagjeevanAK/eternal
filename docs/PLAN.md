# Frontend Update Plan for Asset Tokenization

## Current State

- Frontend built for **Dead Man's Switch** (crypto inheritance)
- Has wallet connection, dashboard, hero sections
- Uses Next.js, Tailwind CSS, @coral-xyz/anchor

---

## New Contract Features to Support

| Instruction | UI Component Needed |
|-------------|---------------------|
| `initialize_platform` | Admin Panel (one-time setup) |
| `register_asset` | Asset Registration Form |
| `verify_asset` | Admin Verification Dashboard |
| `tokenize_asset` | Tokenize Button on Asset Card |
| `buy_fractions` | Marketplace / Buy Modal |
| `sell_fractions` | Portfolio / Sell Modal |
| `add_document` | Document Upload Form |
| `update_asset` | Asset Edit Form |
| `transfer_ownership` | Transfer Modal |

---

## Asset Types

| Type | ID | Description |
|------|-----|-------------|
| Real Estate | 0 | Land, buildings, apartments |
| Gold | 1 | Gold bars, coins |
| Infrastructure | 2 | Roads, bridges, power plants |
| Vehicle | 3 | Cars, trucks, machinery |
| Art | 4 | Paintings, sculptures |
| Commodity | 5 | Other commodities |
| Other | 6 | Miscellaneous |

---

## Proposed Component Structure

```
components/
├── asset-tokenization/
│   ├── AssetCard.tsx           # Display single asset
│   ├── AssetGrid.tsx           # Grid of all assets
│   ├── AssetDetails.tsx        # Full asset page
│   ├── RegisterAssetForm.tsx   # Register new asset
│   ├── BuyFractionsModal.tsx   # Purchase fractions
│   ├── SellFractionsModal.tsx  # Sell fractions
│   ├── DocumentUpload.tsx      # Add documents
│   ├── OwnershipTransfer.tsx   # Transfer ownership
│   └── hooks/
│       ├── useAssetProgram.ts  # Program instance
│       ├── useAssets.ts        # Fetch all assets
│       └── useMyPortfolio.ts   # User's holdings
├── admin/
│   ├── AdminDashboard.tsx      # Platform admin
│   ├── VerifyAsset.tsx         # Verify pending assets
│   └── PlatformStats.tsx       # Trading volume, fees
└── marketplace/
    ├── MarketplacePage.tsx     # Browse & buy
    ├── AssetFilters.tsx        # Filter by type/price
    └── SearchAssets.tsx        # Search functionality
```

---

## Pages Structure

```
app/
├── page.tsx                    # Landing page (updated Hero)
├── marketplace/
│   └── page.tsx               # Browse all tokenized assets
├── asset/
│   └── [id]/page.tsx          # Asset detail page
├── register/
│   └── page.tsx               # Register new asset
├── portfolio/
│   └── page.tsx               # User's owned fractions
├── admin/
│   └── page.tsx               # Platform admin (authority only)
└── dashboard/
    └── page.tsx               # User dashboard (update existing)
```

---

## Implementation Phases

### Phase 1: Foundation (2-3 hrs)
- [ ] Copy IDL types from `asset-tokenization/target/types/`
- [ ] Create `useAssetProgram.ts` hook
- [ ] Create `useAssets.ts` hook to fetch all assets
- [ ] Create `useMyPortfolio.ts` hook for user holdings

### Phase 2: Asset Registration (2-3 hrs)
- [ ] Create `RegisterAssetForm.tsx`
  - Asset type dropdown
  - Valuation input
  - Total fractions input
  - Metadata URI input
  - Documents URI input
  - Location input
  - Document hash (auto-generate from file)
- [ ] Create `/register` page
- [ ] Add navigation link

### Phase 3: Marketplace (3-4 hrs)
- [ ] Create `AssetCard.tsx` component
- [ ] Create `AssetGrid.tsx` with filters
- [ ] Create `AssetFilters.tsx` (by type, price range, status)
- [ ] Create `BuyFractionsModal.tsx`
- [ ] Create `/marketplace` page
- [ ] Add navigation link

### Phase 4: Portfolio (2-3 hrs)
- [ ] Create portfolio page showing owned fractions
- [ ] Create `SellFractionsModal.tsx`
- [ ] Show ownership percentages
- [ ] Show purchase history

### Phase 5: Admin Panel (2 hrs)
- [ ] Create `AdminDashboard.tsx`
- [ ] Create `VerifyAsset.tsx` for pending assets
- [ ] Show platform stats (total volume, fees collected)
- [ ] Protect route (authority wallet only)

### Phase 6: Polish (2 hrs)
- [ ] Update Hero section for asset tokenization
- [ ] Update landing page messaging
- [ ] Add loading states
- [ ] Add error handling
- [ ] Mobile responsiveness

---

## Key Technical Considerations

### Program ID
```typescript
const ASSET_PROGRAM_ID = new PublicKey('EjLLVvxkMtssALhHv4dvKhkxYJQKGmMUcB38DboGMYtJ');
```

### PDA Seeds
```typescript
// Platform Config
['platform-config']

// Asset
['asset', owner.toBuffer(), assetId]

// Ownership
['ownership', asset.toBuffer(), owner.toBuffer()]

// Document
['document', asset.toBuffer(), docType]
```

### Token Metadata Program
```typescript
const TOKEN_METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');
```

---

## UI/UX Notes

1. **Asset Status Colors**
   - Pending: Yellow
   - Verified: Blue
   - Tokenized: Green
   - Frozen: Red
   - Delisted: Gray

2. **Price Display**
   - Show price per fraction
   - Show total valuation
   - Show available vs total fractions

3. **Document Verification**
   - Show document hash
   - Allow verification badge for verified assets

---

## Dependencies to Add

```bash
bun add @metaplex-foundation/mpl-token-metadata
bun add crypto-js  # for document hashing
```

---

## Total Estimated Time: 13-17 hours

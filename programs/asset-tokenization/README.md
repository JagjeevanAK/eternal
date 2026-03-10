# Eternal Asset Program

This package contains the Solana Anchor program for Eternal's local-first asset marketplace flow across company-share and real-estate issues.

The contract no longer uses the older SOL-denominated demo flow. It now mirrors the product lifecycle used by the local app:

- issuer registration and approval
- investor registry, wallet binding, allowlisting, and freeze controls
- asset submission and offering publication
- primary allocation after off-chain payment confirmation
- secondary listing creation, fills, and cancellation
- distribution creation and investor claims

## Contract Lifecycle

```text
register issuer -> approve issuer
register investor -> approve investor
submit asset -> create offering -> approve asset -> publish offering
allocate primary units
create listing -> fill listing -> cancel remainder if needed
create distribution -> claim distribution
```

## Main Instructions

### Platform

- `initialize_platform(primary_fee_bps, secondary_fee_bps)`
- `set_platform_pause(paused)`

### Issuers

- `register_issuer(display_name, city)`
- `approve_issuer()`

### Investors

- `register_investor(legal_name, pan_last4, wallet)`
- `bind_investor_wallet(wallet)`
- `approve_investor()`
- `set_investor_frozen(frozen)`

### Assets and Offerings

- `submit_asset(code, asset_class, asset_type, symbol, name, city, state_name, structure_name, target_yield_bps, target_irr_bps, expected_exit_months)`
- `create_offering(minimum_investment_inr_minor, unit_price_inr_minor, total_units)`
- `approve_asset()`
- `publish_offering()`
- `close_offering()`

### Settlement

- `allocate_primary(units)`
- `create_listing(listing_id, units, price_per_unit_inr_minor)`
- `fill_listing(trade_id, units)`
- `cancel_listing()`
- `create_distribution(distribution_id, amount_per_unit_inr_minor, payable_at)`
- `claim_distribution()`

## Main Accounts

- `PlatformConfig`: authority, treasury, settlement authority, fees, counters, volume totals, pause flag
- `IssuerProfile`: issuer identity, approval state, suspension state, property count
- `InvestorRegistry`: investor identity, PAN suffix, wallet binding, KYC status, allowlist state, freeze state
- `PropertyProject`: asset class, asset type, symbol, structure, yield targets, lifecycle state, linked offering
- `Offering`: price, minimum investment, remaining units, publication state
- `HoldingPosition`: units owned, listed units, average price, invested amount
- `SecondaryListing`: seller escrow record for secondary inventory
- `TradeRecord`: settlement record for each filled listing trade
- `Distribution`: announced per-unit payout and aggregate claim totals
- `DistributionClaim`: per-investor claim receipt

## Local Commands

```bash
cd programs/asset-tokenization

# Build the program and IDL
bun run build

# Start a browser/demo validator manually
bun run localnet

# Initialize the platform PDA on localnet
bun run init:local

# Run the contract test suite with an ephemeral validator
bun run test

# Run the raw Anchor CLI path if you specifically need it
bun run test:anchor
```

`bun run test` is the recommended path. It builds the program, starts a temporary local validator, runs the Bun integration test file, and shuts the validator down automatically.

## Program ID

- localnet/devnet: `EjLLVvxkMtssALhHv4dvKhkxYJQKGmMUcB38DboGMYtJ`

## License

MIT

# Setup

This repo uses a Bun workspace at the root, Next.js apps in `apps/exchange` and `apps/issuance-portal`, local Bun services in `apps/api` and `apps/worker`, and an Anchor program in `programs/asset-tokenization`.

## Prerequisites

- Rust
- Solana CLI
- Anchor CLI `0.32.1`
- Bun `1.x`

## Install

```bash
# From the repo root
bun install
```

## Common Commands

```bash
# One-command local demo setup
bun dev

# Start only the local API
bun run dev:api

# Start only the local worker
bun run dev:worker

# Run only the exchange app on devnet
bun run dev:exchange

# Run the exchange app against localnet
bun run dev:exchange:local

# Run the issuance portal
bun run dev:issuance

# Build the exchange app
bun run build:exchange

# Build the issuance portal
bun run build:issuance

# Lint and type-check the exchange app
bun run lint:exchange
bun run check:exchange

# Lint and type-check the issuance portal
bun run lint:issuance
bun run check:issuance

# Run the Anchor test suite
bun run test:program
```

## Program Package

```bash
cd programs/asset-tokenization

# Build the Anchor program
bun run build

# Run the property-offering contract tests
bun run test

# Run the raw Anchor CLI flow if needed
bun run test:anchor

# Re-run the raw Anchor CLI flow against an existing validator
bun run test:skip
```

## Solana Notes

The main demo flow is localhost-first. `bun dev` starts:

- the local API on `127.0.0.1:4000`
- the local worker
- the local validator on `127.0.0.1:8899`
- the platform initialization script
- the exchange app on `localhost:3000`
- the issuance portal on `localhost:3001`

If you need a fresh wallet:

```bash
solana-keygen new --no-bip39-passphrase
solana config set --url http://127.0.0.1:8899
solana airdrop 20
```

The program test suite runs on localnet by default through `bun run test`, which builds the contract, starts a temporary validator, runs the Bun integration tests, and then stops the validator.

## Troubleshooting

### Anchor version mismatch

```bash
avm use 0.32.1
anchor --version
```

### Local validator issues

```bash
cd programs/asset-tokenization
bun run localnet
```

### Build errors in the program package

```bash
cd programs/asset-tokenization
anchor build
```

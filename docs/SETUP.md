# Setup

This repo uses a Bun workspace at the root, a Next.js app in `apps/web`, and an Anchor program in `programs/asset-tokenization`.

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

# Run only the web app on devnet
bun run dev:web

# Run the web app against localnet
bun run dev:web:local

# Build the web app
bun run build

# Lint and type-check the web app
bun run lint
bun run check

# Run the Anchor test suite
bun run test:program
```

## Program Package

```bash
cd programs/asset-tokenization

# Build the Anchor program
bun run build

# Run Anchor tests against the local validator
bun run test

# Re-run tests against an existing validator
bun run test:skip
```

## Solana Notes

The current frontend flow is wired for devnet. If you need a fresh wallet:

```bash
solana-keygen new --no-bip39-passphrase
solana config set --url devnet
solana airdrop 2
```

The program test suite runs on localnet by default. During `anchor test`, the local validator clones the Metaplex token-metadata program from devnet so the tokenization instruction can execute locally.

For a wallet-connected localhost demo, the fastest path is `bun dev`.

## Troubleshooting

### Anchor version mismatch

```bash
avm use 0.32.1
anchor --version
```

### Local validator issues

```bash
solana-test-validator --reset
```

### Build errors in the program package

```bash
cd programs/asset-tokenization
anchor build
```

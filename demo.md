# Demo Runbook

This file is the judge-facing run order for `Eternal`.

## Recommended Demo Mode

Use `localhost frontend + localnet blockchain + browser wallet`.

That gives you:

- no devnet deployment cost during the demo
- predictable balances and state
- wallet signing inside the browser on `localhost:3000`

## Demo Roles

Prepare these wallets before the demo:

- `Wallet A`: platform authority and treasury
- `Wallet B`: asset issuer
- `Wallet C`: investor / buyer

For the easiest setup, use Phantom for the localnet demo. The app also supports Solflare, but Phantom is the simplest wallet for local RPC demos.

## One-Time Setup

Run this once before the event:

```bash
bun install
```

Optional confidence check:

```bash
bun run lint
bun run check
bun run build
bun run test:program
```

## Local Demo Sequence

### One command

From the repo root:

```bash
bun dev
```

That command:

- builds the Anchor program
- starts the local validator
- waits for the RPC endpoint
- initializes the platform config
- starts the web UI on `http://localhost:3000`

If you already know you want the manual breakdown, use the steps below.

### Terminal 1: Build the program

```bash
cd programs/asset-tokenization
bun run build
```

### Terminal 2: Start the local validator

```bash
cd programs/asset-tokenization
bun run localnet
```

Keep this terminal open for the whole demo.

### Terminal 3: Initialize the platform config

Use the authority wallet keypair for this step.

```bash
cd programs/asset-tokenization
ANCHOR_WALLET=~/.config/solana/id.json bun run init:local
```

If you want a separate treasury, pass it explicitly:

```bash
cd programs/asset-tokenization
ANCHOR_WALLET=~/.config/solana/id.json TREASURY=<TREASURY_PUBKEY> bun run init:local
```

### Terminal 4: Fund the demo wallets on localnet

Fund any browser wallets you plan to use as issuer or buyer:

```bash
solana airdrop 20 <WALLET_B_PUBKEY> --url http://127.0.0.1:8899
solana airdrop 20 <WALLET_C_PUBKEY> --url http://127.0.0.1:8899
```

### Terminal 5: Start the web app against localnet

From the repo root:

```bash
bun run dev:web:local
```

Open `http://localhost:3000`.

### Wallet setup in the browser

For Phantom:

1. Enable developer settings in Phantom.
2. Add/select localnet or a custom RPC pointing to `http://127.0.0.1:8899`.
3. Use `Wallet A`, `Wallet B`, and `Wallet C` as needed during the demo.

## Judge Demo Story

Use this order in front of judges:

1. Open `/` and explain the problem: real-world assets are illiquid, slow to transfer, and hard to fractionalize.
2. Connect `Wallet B` and open `/register`.
3. Register a sample asset.
   Suggested values:
   `Asset ID`: `DEMO-LAND-001`
   `Type`: `Real Estate`
   `Valuation`: `100`
   `Fractions`: `1000`
   `Location`: `Mumbai, Maharashtra, India`
   `Metadata URI`: `https://example.com/assets/demo-land-001.json`
   `Documents URI`: `https://example.com/assets/demo-land-001-docs.pdf`
   `Document Content`: `Title deed hash for demo land asset`
4. Open `/marketplace` and show that the asset now exists on-chain but is not yet tradable.
5. Switch to `Wallet A` and open `/admin`.
6. Show the pending asset and verify it.
7. Open the asset detail page and tokenize it.
   Suggested token values:
   `Name`: `Demo Land Fraction`
   `Symbol`: `DLF`
   `URI`: `https://example.com/tokens/demo-land-fraction.json`
8. Return to `/marketplace` and show the asset in tokenized state.
9. Switch to `Wallet C`.
10. Buy a small number of fractions.
11. Open `/portfolio` and show the investor holdings.
12. Optional close: switch back to `Wallet B` and show sell flow or ownership transfer flow.

## Fast Recovery Steps

If the demo state gets messy:

1. Stop the validator.
2. Restart `bun run localnet`.
3. Re-run `bun run init:local`.
4. Re-airdrop demo wallets.
5. Refresh the browser.

## Devnet Backup Plan

Use this only if you need a public/shared network.

### Deploy or update the program

```bash
cd programs/asset-tokenization
anchor deploy --provider.cluster devnet
```

### Initialize the platform on devnet

```bash
cd programs/asset-tokenization
ANCHOR_WALLET=~/.config/solana/id.json bun run init:devnet
```

### Start the web app in default devnet mode

```bash
bun run dev:web
```

### Notes for devnet mode

- the frontend defaults to devnet
- your browser wallet must be on devnet
- you need devnet SOL for deploys and transactions
- deploy cost is test SOL, not real SOL, but faucet balance can still block you

## What To Say In One Line

`Eternal turns real-world assets into verified, tradable fractions on Solana, and this demo shows the full lifecycle from registration to investor ownership.`

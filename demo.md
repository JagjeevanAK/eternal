# Demo Runbook

This file is the judge-facing local product run order for `Eternal`.

## Recommended Demo Mode

Use `localhost frontend + local API + local worker + localnet blockchain`.

That gives you:

- seeded investors, issuer, and admin accounts
- predictable INR balances, live assets, orders, and listings
- optional wallet binding on localhost without forcing wallet-first onboarding

## Demo Roles

Use the seeded accounts:

- `admin@eternal.local`: compliance and publishing queue
- `issuer@eternal.local`: issuer workspace
- `alpha@eternal.local`: approved investor with holdings
- `beta@eternal.local`: approved investor with cash balance
- `pending@eternal.local`: investor who still needs KYC

The local OTP code is always `000000`.

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

`bun run test:program` now builds the Anchor program, boots a temporary local validator, runs the asset-offering contract tests, and shuts the validator down automatically.

## Local Demo Sequence

### One command

From the repo root:

```bash
bun dev
```

That command:

- starts the local API on `http://127.0.0.1:4000`
- starts the local worker for settlement jobs
- builds the Anchor program
- starts the local validator
- waits for the RPC endpoint
- initializes the platform config
- reapplies the demo seed to local state and localnet
- starts the web UI on `http://localhost:3000`

If you want the manual breakdown, use the steps below.

### Terminal 1: API

```bash
cd apps/api
bun run dev
```

### Terminal 2: Worker

```bash
cd apps/worker
bun run dev
```

### Terminal 3: Program and validator

```bash
cd programs/asset-tokenization
bun run build
bun run localnet
```

### Terminal 4: Initialize the platform config

```bash
cd programs/asset-tokenization
ANCHOR_WALLET=~/.config/solana/id.json bun run init:local
```

### Terminal 5: Seed the demo state

From the repo root:

```bash
bun run seed:demo
```

This resets the local API state and pushes the seeded assets, holdings, and listings onto localnet.

### Terminal 6: Optional wallet funding

```bash
solana airdrop 20 <CONNECTED_WALLET_PUBKEY> --url http://127.0.0.1:8899
```

### Terminal 7: Start the web app

From the repo root:

```bash
bun run dev:web:local
```

Open `http://localhost:3000`.

## Demo Story

Use this order:

1. Open `/` and explain that Eternal is now a local-first asset marketplace for company-share and real-estate issues.
2. Open `/login` and sign in as `pending@eternal.local` with OTP `000000`.
3. Open `/kyc` and submit the investor details.
4. Sign out and sign in as `admin@eternal.local`.
5. Open `/admin` and approve the pending KYC record.
6. Sign out and sign in as `issuer@eternal.local`.
7. Open `/issuer` and show:
   - an existing live real-estate issue
   - an existing live company-share issue
   - one asset in review
   - the issuer submission form
8. Submit a new asset or use the existing review item.
9. Switch back to `admin@eternal.local`.
10. Approve and publish the pending asset from `/admin`.
11. Sign in as `beta@eternal.local`.
12. Open `/marketplace`, then an asset room, and create a primary order.
13. Open `/payments` and mark the mock UPI payment as paid.
14. Wait for the worker to settle, then open `/portfolio` and show the new holding.
15. From `/portfolio`, create a secondary listing.
16. Sign in as `alpha@eternal.local` or switch back to `beta@eternal.local` depending on the trade story.
17. Open the asset room and buy a secondary listing.
18. Mark the payment as paid, let the worker settle it, then verify:
   - `/orders`
   - `/payments`
   - `/portfolio`
   all update correctly.
19. Optional close: connect Phantom on localnet and bind the wallet from `/dashboard`.

## Fast Recovery Steps

If the demo state gets messy:

1. Stop `bun dev`.
2. Reset the local API state:
   `curl -X POST http://127.0.0.1:4000/reset`
3. Re-seed the demo state:
   `bun run seed:demo`
4. Restart `bun dev`.
5. Refresh the browser and sign in again.

## Devnet Backup Plan

The current product layer is intended to run locally. The Solana program still supports devnet-oriented work, but the hackathon-ready issuer, KYC, payment, and settlement flow is now designed around localhost.

## What To Say In One Line

`Eternal is a local-first asset marketplace that takes users from KYC and issuer onboarding to browsing, buying, and reselling company-share and real-estate issues on localhost.`

# Eternal

Eternal is a local-first tokenized asset marketplace with a Next.js frontend, a Bun API, a worker process, and a Solana Anchor program that mirrors the lifecycle for issuers, investors, offerings, listings, and distributions across company-share and real-estate assets.

## Workspace Layout

```text
eternal/
├── apps/
│   ├── api/                   # Local product API with seeded state and mock services
│   ├── web/                   # Next.js product frontend
│   └── worker/                # Local settlement and async job worker
├── programs/
│   └── asset-tokenization/    # Anchor program, tests, migrations
├── docs/
│   ├── ARCHITECTURE.md
│   └── SETUP.md
├── package.json               # Bun workspace root
└── bun.lock
```

## Quick Start

```bash
# Install workspace dependencies
bun install

# One-command local product stack
bun dev

# Start pieces individually
bun run dev:api
bun run dev:worker
bun run dev:web
bun run dev:web:local

# Build the web app
bun run build

# Lint and type-check the web app
bun run lint
bun run check

# Run Anchor tests
bun run test:program
```

## Local Product Flow

When `bun dev` is running:

- web app: `http://localhost:3000`
- local API: `http://127.0.0.1:4000`
- worker: local async settlement loop over seeded state
- Solana localnet: `http://127.0.0.1:8899`

The product now centers on:

- seeded app-account login with mock OTP (`000000`)
- KYC review flow
- issuer asset submissions
- admin approval and publish flow
- INR-denominated investing
- local secondary listings with worker-led settlement
- optional Solana wallet binding
- an Anchor contract that models issuer approval, investor allowlisting, asset offerings, holdings, listings, trades, and distributions

## Docs

- [demo.md](demo.md): local demo sequence for the product stack
- [docs/SETUP.md](docs/SETUP.md): local development and toolchain setup
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): repo layout and active app boundaries
- [programs/asset-tokenization/README.md](programs/asset-tokenization/README.md): program-specific notes

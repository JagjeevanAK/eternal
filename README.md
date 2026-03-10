# Eternal

Eternal is an asset-tokenization monorepo with a Next.js frontend and a Solana Anchor program. The product is focused on registering, verifying, tokenizing, and trading real-world assets on Solana.

## Workspace Layout

```text
eternal/
├── apps/
│   └── web/                   # Next.js app
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

# One-command local demo setup
bun dev
# or
bun run dev

# Start only the web app on devnet
bun run dev:web

# Start the web app against localnet
bun run dev:web:local

# Build the web app
bun run build

# Lint and type-check the web app
bun run lint
bun run check

# Run Anchor tests
bun run test:program
```

## Program Details

- Program package: `programs/asset-tokenization`
- Program ID: `EjLLVvxkMtssALhHv4dvKhkxYJQKGmMUcB38DboGMYtJ`

## Docs

- [demo.md](demo.md): hackathon demo sequence for judges and users
- [docs/SETUP.md](docs/SETUP.md): local development and toolchain setup
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): repo layout and active app boundaries
- [programs/asset-tokenization/README.md](programs/asset-tokenization/README.md): program-specific notes

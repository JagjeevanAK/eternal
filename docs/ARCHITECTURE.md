# Architecture

## Monorepo Shape

The repo is organized around one product: `Eternal`, an asset-tokenization platform.

```text
apps/web
programs/asset-tokenization
docs
```

## Web App

`apps/web` contains the Next.js app.

- `app/page.tsx`: marketing landing page
- `app/(app)/*`: authenticated app routes that share one shell
- `components/ui`: shared UI primitives used across features and marketing
- `components/marketing`: landing-page-only components
- `features/assets`: asset-tokenization feature code

## Asset Feature Boundary

The active product code is grouped under `apps/web/features/assets`:

- `components`: marketplace, portfolio, admin, tokenization, and modal flows
- `hooks`: Anchor program access and on-chain data fetching
- `types.ts`: asset program account and helper types
- `idl/asset_tokenization.json`: frontend-compatible IDL snapshot

## Program Package

`programs/asset-tokenization` contains the Anchor workspace:

- Rust program sources in `programs/asset_tokenization/src`
- integration tests in `tests`
- migrations and Anchor config for local and devnet work

## Current Boundaries

- The repo is asset-tokenization-only.
- The old legacy product path has been removed from active source, routes, and docs.
- The web app defaults to devnet and can be pointed to localnet with `NEXT_PUBLIC_SOLANA_CLUSTER` and `NEXT_PUBLIC_SOLANA_RPC_URL`.

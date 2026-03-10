# Architecture

## Monorepo Shape

The repo is organized around one local-first product: `Eternal`, a tokenized asset marketplace for company-share and real-estate issues.

```text
apps/api
apps/web
apps/worker
programs/asset-tokenization
docs
```

## Product Stack

- `apps/web` contains the Next.js frontend and product shell.
- `apps/api` contains the local Bun API with seeded product state and mock services.
- `apps/worker` processes local settlement jobs for payments, primary allocations, and secondary trades.
- `programs/asset-tokenization` contains the Anchor program for issuer approval, investor allowlisting, asset offerings, holdings, listings, trades, and distributions.

## Web App

`apps/web` now exposes:

- public routes: `/`, `/login`, `/marketplace`, `/marketplace/[slug]`, `/kyc`
- authenticated routes: `/dashboard`, `/portfolio`, `/orders`, `/payments`, `/documents`, `/issuer`, `/admin`
- shared providers for theme, wallet, and local product session state

The active product UI lives under `apps/web/features/product`.

## Local Product Services

`apps/api` is the source of truth for:

- seeded user accounts and local sessions
- KYC records
- issuer asset submissions
- asset catalogue and due-diligence documents
- orders, payments, holdings, listings, trades, and distributions
- admin queues and local notifications

`apps/worker` mutates that state asynchronously to simulate:

- primary order settlement
- secondary trade settlement
- treasury fee accrual
- issuer and investor notifications

## Current Boundaries

- The user-facing product is asset-first and INR-native.
- Wallet connection is optional and no longer the main onboarding path.
- The older generic routes now redirect into the live marketplace flow or are marked as legacy.
- The API and worker still drive the demo settlement flow, but the on-chain program now mirrors the same compliant asset lifecycle instead of the older SOL-denominated asset/fractions model.

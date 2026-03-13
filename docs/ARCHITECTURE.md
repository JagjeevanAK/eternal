# Architecture

## Monorepo Shape

The repo is organized around one local-first product: `Eternal`, a tokenized asset marketplace for company-share and real-estate issues.

```text
apps/api
apps/exchange
apps/issuance-portal
apps/worker
programs/asset-tokenization
docs
```

## Product Stack

- `apps/exchange` contains the Next.js exchange frontend and investor workspace.
- `apps/issuance-portal` contains the issuer, owner-verification, and admin-review frontend.
- `apps/api` contains the local Bun API with seeded product state and mock services.
- `apps/worker` processes local settlement jobs for payments, primary allocations, and secondary trades.
- `programs/asset-tokenization` contains the Anchor program for issuer approval, investor allowlisting, asset offerings, holdings, listings, trades, and distributions.

## Frontends

`apps/exchange` now exposes:

- public routes: `/`, `/login`, `/marketplace`, `/marketplace/[slug]`, `/kyc`
- authenticated routes: `/dashboard`, `/portfolio`, `/orders`, `/payments`, `/documents`
- shared providers for theme, wallet, and local product session state

`apps/issuance-portal` now exposes:

- public routes: `/`, `/login`, `/signup`
- authenticated routes: `/verification`, `/issuer`, `/issuer/review`, `/admin`
- shared providers for theme and local product session state

The exchange product UI lives under `apps/exchange/features/product`.
The issuance portal UI lives under `apps/issuance-portal/features/portal`.

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

# Exchange App

The exchange frontend lives in `apps/exchange`.

## Run

```bash
# From the repo root
bun run dev:exchange

# Or from apps/exchange
bun dev
```

This starts the Next.js exchange app on `http://localhost:3000`.

## Full Local Stack

If you also want the local API, worker, seeded data, and Solana localnet:

```bash
bun dev
```

## Notes

- The app calls the local API at `http://127.0.0.1:4000` by default.
- Seeded investor accounts use OTP `000000`.
- Primary orders, listings, and fills map to the Anchor program in `programs/asset-tokenization`.

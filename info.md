# Localnet On-Chain Activity Guide

This project is not just web UI state. The exchange and API sync asset, holding, listing, and trade activity to a Solana program running on localnet.

## What This Project Is And Is Not

Short answer: this project is **partially web3**, not "everything is on-chain".

What is on localnet:

- issuer registry
- investor registry
- investor wallet binding
- asset submission
- offering creation
- offering publication
- primary unit allocation
- secondary listing creation
- secondary trade settlement
- holding account state
- distribution and claim records

What is **not** on localnet:

- email/OTP auth
- KYC form submission workflow itself
- mock INR payment capture
- SQLite/session storage
- a real SPL token mint / token account based issuance flow

Important distinction:

- the project **does represent issuance on-chain**
- but it does **not mint SPL tokens**
- instead, it tracks issued units and investor holdings inside the custom Anchor program accounts

So if someone asks "does this mint tokens on localnet?", the accurate answer is:

```text
No, not SPL tokens.
It records asset/offering/holding/trade state on Solana localnet using custom program accounts.
```

Program ID:

```bash
EjLLVvxkMtssALhHv4dvKhkxYJQKGmMUcB38DboGMYtJ
```

Local RPC:

```bash
http://127.0.0.1:8899
```

## 1. Start the stack

Run the full local demo stack first:

```bash
bun dev
```

That starts:

- exchange UI on `http://localhost:3000`
- issuance portal on `http://localhost:3001`
- admin portal on `http://localhost:3002`
- API on `http://127.0.0.1:4000`
- Solana localnet on `http://127.0.0.1:8899`

## 2. Point Solana CLI to localnet

Use either of these:

```bash
solana config set --url http://127.0.0.1:8899
```

or keep the URL inline on every command:

```bash
solana <command> --url http://127.0.0.1:8899
```

## 3. Where to get on-chain references from the UI

Use these screens in the exchange app:

- Portfolio:
  holding account address for each investor position
- Orders:
  settlement signature and trade record address after orders settle
- Marketplace asset detail:
  property account and offering account

These values are surfaced by the exchange UI from the chain sync code in:

- [apps/api/src/chain.ts](/Users/jagjeevankashid/Developer/hackethon/eternal/apps/api/src/chain.ts)

## 3A. What you can prove with Solana CLI

With `solana` CLI you can prove:

- a transaction signature landed on localnet
- an account exists on localnet
- an account belongs to the expected program
- logs were emitted by the local program while the UI action happened

With only `solana` CLI, you do **not** get nice decoded field names for this custom Anchor account data.  
`solana account` proves the account exists on-chain, but it will not cleanly show fields like `issued_units` or `remaining_units` in human-friendly form.

So the clean demo story is:

1. use the UI to show the address/signature
2. use `solana confirm` and `solana account` to prove it is on localnet
3. use the app UI or API read model to show the decoded business meaning

## 4. Verify a transaction signature

When an order settles, copy the settlement signature from the Orders page and run:

```bash
solana confirm <SIGNATURE> --url http://127.0.0.1:8899 --verbose
```

This is the easiest way to prove the action hit localnet.

## 5. Inspect on-chain accounts

### Holding account

Copy the holding account address from the Portfolio page:

```bash
solana account <HOLDING_ADDRESS> --url http://127.0.0.1:8899
```

### Trade record

Copy the trade record address from the Orders page:

```bash
solana account <TRADE_ADDRESS> --url http://127.0.0.1:8899
```

### Property account

Copy the property account from the asset detail page:

```bash
solana account <PROPERTY_ADDRESS> --url http://127.0.0.1:8899
```

### Offering account

Copy the offering account from the asset detail page:

```bash
solana account <OFFERING_ADDRESS> --url http://127.0.0.1:8899
```

### Listing account

If a listing has synced on-chain and you have its listing address:

```bash
solana account <LISTING_ADDRESS> --url http://127.0.0.1:8899
```

## 5A. Asset issuance / "asset converted into tokens" clarification

This repo does **not** create SPL token mints.

What happens instead:

- issuer submits an asset on-chain
- issuer creates an offering on-chain
- admin publishes the offering on-chain
- investor primary settlement allocates units on-chain
- the investor holding account updates on-chain

So the closest "token issuance" proof in this repo is:

1. show the property account exists
2. show the offering account exists
3. show a primary settlement signature
4. show the holding account exists for the investor after settlement

Use these commands:

```bash
solana account <PROPERTY_ADDRESS> --url http://127.0.0.1:8899
solana account <OFFERING_ADDRESS> --url http://127.0.0.1:8899
solana confirm <PRIMARY_SETTLEMENT_SIGNATURE> --url http://127.0.0.1:8899 --verbose
solana account <HOLDING_ADDRESS> --url http://127.0.0.1:8899
```

What this proves:

- the asset/offering was created on localnet
- the settlement transaction landed on localnet
- the investor now has an on-chain holding account

What it does **not** prove:

- a fungible token mint was created
- SPL tokens were issued to a wallet

Because that feature is not implemented in this repo.

## 5B. How to prove holdings and trades are on-chain

### Primary order settlement

After a primary order is paid and settled:

- Orders page shows a settlement signature
- Portfolio page shows a holding account

Check them with:

```bash
solana confirm <PRIMARY_SETTLEMENT_SIGNATURE> --url http://127.0.0.1:8899 --verbose
solana account <HOLDING_ADDRESS> --url http://127.0.0.1:8899
```

### Secondary trade settlement

After buying a secondary listing:

- Orders page shows a settlement signature
- Orders page may show a trade record address
- Portfolio page shows updated holding account(s)

Check them with:

```bash
solana confirm <SECONDARY_SETTLEMENT_SIGNATURE> --url http://127.0.0.1:8899 --verbose
solana account <TRADE_ADDRESS> --url http://127.0.0.1:8899
solana account <HOLDING_ADDRESS> --url http://127.0.0.1:8899
```

## 6. Watch localnet logs live

If you want to demonstrate activity while clicking around the app:

```bash
solana logs --url http://127.0.0.1:8899
```

To narrow logs to this program:

```bash
solana logs --url http://127.0.0.1:8899 | rg EjLLVvxkMtssALhHv4dvKhkxYJQKGmMUcB38DboGMYtJ
```

Useful demo flow:

1. Start `solana logs`
2. Create a primary order or buy a listing in the exchange UI
3. Complete the payment flow
4. Watch localnet emit program activity
5. Copy the resulting settlement signature from Orders
6. Run `solana confirm <SIGNATURE> --verbose`

## 7. Quick proof checklist

If you need to quickly show this is actually web3 and not only web2:

1. Open an asset page and show the property/offering account addresses.
2. Place an order and settle it.
3. Open Orders and show the settlement signature.
4. Run:

```bash
solana confirm <SIGNATURE> --url http://127.0.0.1:8899 --verbose
```

5. Open Portfolio and show the holding account address.
6. Run:

```bash
solana account <HOLDING_ADDRESS> --url http://127.0.0.1:8899
```

That is the cleanest CLI proof that the exchange actions are hitting Solana localnet.

## 8. Funding Phantom On Localnet

Yes, you can put **localnet SOL** into Phantom.

Use:

```bash
solana airdrop 20 <PHANTOM_WALLET_ADDRESS> --url http://127.0.0.1:8899
```

Check the balance with:

```bash
solana balance <PHANTOM_WALLET_ADDRESS> --url http://127.0.0.1:8899
```

If you want this to happen automatically when starting the stack, use:

```bash
DEMO_AIRDROP_WALLETS=<PHANTOM_WALLET_ADDRESS> DEMO_AIRDROP_SOL=20 bun dev
```

or add those values in your environment before running `bun dev`.

Important:

- this funds the Phantom wallet with **localnet SOL**
- it is useful to prove the wallet is real and connected to localnet
- but it does **not** increase buying power inside the exchange app today

Why:

- the app currently buys assets using **mock INR balance**
- payment capture happens off-chain first
- after that, settlement is pushed to Solana localnet

So there are two different balances in the current architecture:

1. Phantom/localnet SOL balance  
Used for wallet presence and localnet wallet activity

2. Exchange mock INR balance  
Used by the app to pay for primary and secondary orders

If your goal is only:

- "show Phantom has money on localnet"

then `solana airdrop` is enough.

If your goal is:

- "actually buy assets in this app"

then you need enough **mock INR balance** on the investor account, not just SOL in Phantom.

## 9. Notes

- Localnet data is ephemeral unless you keep the same validator state running.
- Primary settlements write the settlement signature and sync the holding account on-chain.
- Secondary settlements write both a settlement signature and a trade record account on-chain.
- Wallet binding is synced into the on-chain investor registry.
- KYC approval is used to allowlist the investor in the program registry.
- Mock INR payment capture happens off-chain first, and only then triggers localnet settlement.
- Asset issuance in this repo is program-account based, not SPL-token based.
- Some UI sections show shortened addresses, so copy the full value where available before using CLI.

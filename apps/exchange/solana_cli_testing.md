# Solana CLI Testing

Use these commands to show the blockchain flow working from the terminal.

## Terminal 1

```bash
cd /Users/jagjeevankashid/Developer/hackethon/eternal/programs/asset-tokenization
anchor build
solana-test-validator --reset --bind-address 127.0.0.1 --ledger /tmp/eternal-demo-ledger --rpc-port 18899 --faucet-port 19901 --gossip-port 18005 --dynamic-port-range 18010-18040 --bpf-program EjLLVvxkMtssALhHv4dvKhkxYJQKGmMUcB38DboGMYtJ target/deploy/asset_tokenization.so
```

Leave that validator running.

## Terminal 2

```bash
cd /Users/jagjeevankashid/Developer/hackethon/eternal/programs/asset-tokenization
solana -u http://127.0.0.1:18899 cluster-version
env ANCHOR_PROVIDER_URL=http://127.0.0.1:18899 ANCHOR_WALLET=$HOME/.config/solana/id.json bun test ./tests/asset_tokenization.test.ts
env ANCHOR_PROVIDER_URL=http://127.0.0.1:18899 ANCHOR_WALLET=$HOME/.config/solana/id.json bun run scripts/init-platform.ts
```

## What To Point Out

- `cluster-version` proves the local validator is reachable.
- `bun test` should end with `10 pass` and `0 fail`.
- `init-platform.ts` should print `Platform already initialized.` after the tests create the platform config.
- Stop the validator with `Ctrl+C` in Terminal 1 when the demo is done.

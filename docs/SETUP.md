# Developer Setup Guide

Complete guide to set up the project locally for development.

## Prerequisites

- [Rust](https://rustup.rs/) (latest stable)
- [Solana CLI](https://docs.solana.com/cli/install-solana-cli-tools) (v1.18+)
- [Anchor CLI](https://www.anchor-lang.com/docs/installation) (v0.32.1)
- [Bun](https://bun.sh/) (v1.0+)

## Step-by-Step Installation

### 1. Install Rust

```bash
# Install Rust via rustup
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Restart terminal or run:
source $HOME/.cargo/env

# Verify installation
rustc --version
```

### 2. Install Solana CLI

```bash
# macOS / Linux
sh -c "$(curl -sSfL https://release.anza.xyz/stable/install)"

# Add to PATH (add this to your ~/.zshrc or ~/.bashrc)
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"

# Verify installation
solana --version
```

### 3. Install Anchor CLI

```bash
# Install AVM (Anchor Version Manager)
cargo install --git https://github.com/coral-xyz/anchor avm --force

# Install and use Anchor 0.32.1
avm install 0.32.1
avm use 0.32.1

# Verify installation
anchor --version
```

### 4. Install Bun

```bash
# macOS / Linux
curl -fsSL https://bun.sh/install | bash

# Verify installation
bun --version
```

## Quick Start

```bash
# Clone the repository
git clone https://github.com/your-username/eternal-key.git
cd eternal-key

# Full setup (install deps + generate keys + build)
make setup

# Run tests
make test
```

## Manual Setup (without Make)

If you prefer not to use Make:

```bash
# 1. Install JS dependencies
cd asset-tokenization
bun install

# 2. Generate Solana keypair (if you don't have one)
solana-keygen new --no-bip39-passphrase

# 3. Configure Solana for local development
solana config set --url localhost

# 4. Build the program
anchor build

# 5. Run tests (starts local validator automatically)
anchor test
```

## Available Make Commands

| Command | Description |
|---------|-------------|
| `make setup` | Full setup (install deps + generate keys + build) |
| `make install` | Install all dependencies |
| `make build` | Build the Solana program |
| `make test` | Run all tests (starts local validator) |
| `make test-skip` | Run tests (assumes validator running) |
| `make clean` | Remove build artifacts |
| `make validator` | Start local Solana validator |
| `make deploy-localnet` | Deploy to localnet |
| `make deploy-devnet` | Deploy to Solana devnet |
| `make versions` | Check installed tool versions |

## Troubleshooting

### Build fails with "edition2024" error

```bash
# This is a known issue with newer crate versions. The project includes
# a Cargo.lock that pins compatible versions. Make sure you're using it.
cd asset-tokenization && anchor build
```

### Tests fail with "Connection refused"

```bash
# The local validator isn't running. Use `anchor test` which starts it,
# or start it manually:
solana-test-validator --reset
```

### "Unable to read keypair file"

```bash
# Generate a new keypair:
solana-keygen new --no-bip39-passphrase -o ~/.config/solana/id.json
```

### Anchor version mismatch

```bash
# Make sure you're using Anchor 0.32.1
avm use 0.32.1
anchor --version
```

## Environment Configuration

### Local Development (default)

```bash
solana config set --url localhost
```

### Devnet

```bash
solana config set --url devnet
solana airdrop 2  # Get test SOL
```

### Mainnet

```bash
solana config set --url mainnet-beta
# Make sure you have real SOL for transactions
```

## Project Structure

```
eternal-key/
├── app/                        # Next.js frontend
│   ├── page.tsx               # Landing page
│   ├── dashboard/             # User dashboard
│   └── layout.tsx             # Root layout
├── asset-tokenization/         # Solana program (Anchor)
│   ├── programs/              # Rust smart contracts
│   │   └── asset_tokenization/
│   │       └── src/
│   │           ├── lib.rs     # Program entry point
│   │           ├── instructions/
│   │           ├── state/
│   │           └── error.rs
│   ├── tests/                 # Integration tests
│   ├── Anchor.toml            # Anchor configuration
│   └── Cargo.lock             # Locked dependencies
├── components/                 # React components
├── docs/                       # Documentation
├── Makefile                   # Development commands
└── README.md
```

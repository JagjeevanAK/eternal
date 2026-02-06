.PHONY: help setup install build test clean lint deploy-devnet deploy-localnet validator keys

# Default target
help:
	@echo "Asset Tokenization - Development Commands"
	@echo ""
	@echo "First-time Setup (recommended):"
	@echo "  make setup          - Full setup (install all deps + keys + build)"
	@echo ""
	@echo "Setup & Install:"
	@echo "  make install        - Install all dependencies (frontend + contract)"
	@echo "  make keys           - Generate Solana keypair if missing & configure devnet"
	@echo ""
	@echo "Development:"
	@echo "  make build          - Build the Solana program"
	@echo "  make dev            - Start Next.js frontend dev server"
	@echo "  make test           - Run all tests (starts local validator)"
	@echo "  make test-skip      - Run tests (assumes validator running)"
	@echo "  make clean          - Remove build artifacts"
	@echo "  make validator      - Start local Solana validator"
	@echo "  make versions       - Check installed tool versions"
	@echo ""
	@echo "Deployment:"
	@echo "  make deploy-localnet - Deploy to localnet"
	@echo "  make deploy-devnet   - Deploy to devnet"
	@echo ""
	@echo "Prerequisites:"
	@echo "  - Rust (rustup.rs)"
	@echo "  - Solana CLI (solana-install)"
	@echo "  - Anchor CLI (avm use 0.32.1)"
	@echo "  - Node.js / Bun (bun.sh)"

# Full project setup
setup: install keys build
	@echo "[OK] Setup complete. Run 'make test' to verify."

# Install all dependencies (frontend + contract)
install:
	@echo "[*] Installing dependencies..."
	@if ! command -v solana &> /dev/null; then \
		echo "[ERROR] Solana CLI not found. Install from https://docs.solana.com/cli/install-solana-cli-tools"; \
		exit 1; \
	fi
	@if ! command -v anchor &> /dev/null; then \
		echo "[ERROR] Anchor CLI not found. Install with: cargo install --git https://github.com/coral-xyz/anchor avm && avm install 0.32.1 && avm use 0.32.1"; \
		exit 1; \
	fi
	@echo "[*] Installing frontend dependencies..."
	npm install
	@echo "[*] Installing contract dependencies..."
	cd asset-tokenization && bun install
	@echo "[OK] All dependencies installed"

# Generate Solana keypair if not exists, configure for devnet
keys:
	@echo "[*] Checking Solana keypair..."
	@if [ ! -f ~/.config/solana/id.json ]; then \
		echo "Generating new keypair..."; \
		solana-keygen new --no-bip39-passphrase -o ~/.config/solana/id.json; \
	else \
		echo "Keypair exists: $$(solana address)"; \
	fi
	@echo "[*] Configuring Solana CLI for devnet..."
	@solana config set --url devnet
	@echo "[*] Requesting devnet airdrop (2 SOL)..."
	@solana airdrop 2 || echo "[WARN] Airdrop failed — you may need to retry or use https://faucet.solana.com"
	@echo "[OK] Solana configured for devnet. Balance: $$(solana balance)"

# Build the Solana program
build:
	@echo "[*] Building program..."
	cd asset-tokenization && anchor build
	@echo "[OK] Build complete"

# Run tests (starts local validator)
test:
	@echo "[*] Running tests..."
	cd asset-tokenization && anchor test

# Run tests without starting validator
test-skip:
	@echo "[*] Running tests (skip validator)..."
	cd asset-tokenization && anchor test --skip-local-validator

# Clean build artifacts
clean:
	@echo "[*] Cleaning build artifacts..."
	cd asset-tokenization && rm -rf target node_modules
	@echo "[OK] Clean complete"

# Start local Solana validator
validator:
	@echo "[*] Starting local validator..."
	solana-test-validator --reset

# Deploy to localnet
deploy-localnet:
	@echo "[*] Deploying to localnet..."
	@solana config set --url localhost
	cd asset-tokenization && anchor deploy --provider.cluster localnet
	@echo "[OK] Deployed to localnet"

# Deploy to devnet
deploy-devnet:
	@echo "[*] Deploying to devnet..."
	@solana config set --url devnet
	@echo "Requesting airdrop..."
	@solana airdrop 2 || true
	cd asset-tokenization && anchor deploy --provider.cluster devnet
	@echo "[OK] Deployed to devnet"

# Start frontend dev server
dev:
	@echo "[*] Starting Next.js dev server..."
	npm run dev

# Check versions
versions:
	@echo "Tool Versions:"
	@echo "  Rust:   $$(rustc --version 2>/dev/null || echo 'not installed')"
	@echo "  Solana: $$(solana --version 2>/dev/null || echo 'not installed')"
	@echo "  Anchor: $$(anchor --version 2>/dev/null || echo 'not installed')"
	@echo "  Node:   $$(node --version 2>/dev/null || echo 'not installed')"
	@echo "  Bun:    $$(bun --version 2>/dev/null || echo 'not installed')"
	@echo ""
	@echo "Solana Config:"
	@echo "  Cluster: $$(solana config get | grep 'RPC URL' || echo 'unknown')"
	@echo "  Wallet:  $$(solana address 2>/dev/null || echo 'no keypair')"
	@echo "  Balance: $$(solana balance 2>/dev/null || echo 'unknown')"

.PHONY: help setup install build test clean lint deploy-devnet deploy-localnet validator keys

# Default target
help:
	@echo "Asset Tokenization - Development Commands"
	@echo ""
	@echo "Setup & Install:"
	@echo "  make setup          - Full setup (install deps + generate keys + build)"
	@echo "  make install        - Install all dependencies"
	@echo "  make keys           - Generate Solana keypair if missing"
	@echo ""
	@echo "Development:"
	@echo "  make build          - Build the Solana program"
	@echo "  make test           - Run all tests (starts local validator)"
	@echo "  make test-skip      - Run tests (assumes validator running)"
	@echo "  make clean          - Remove build artifacts"
	@echo "  make validator      - Start local Solana validator"
	@echo ""
	@echo "Deployment:"
	@echo "  make deploy-localnet - Deploy to localnet"
	@echo "  make deploy-devnet   - Deploy to devnet"
	@echo ""
	@echo "Prerequisites:"
	@echo "  - Rust (rustup.rs)"
	@echo "  - Solana CLI (solana-install)"
	@echo "  - Anchor CLI (avm use 0.32.1)"
	@echo "  - Bun (bun.sh)"

# Full project setup
setup: install keys build
	@echo "[OK] Setup complete. Run 'make test' to verify."

# Install all dependencies
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
	@if ! command -v bun &> /dev/null; then \
		echo "[ERROR] Bun not found. Install from https://bun.sh"; \
		exit 1; \
	fi
	cd asset-tokenization && bun install
	@echo "[OK] Dependencies installed"

# Generate Solana keypair if not exists
keys:
	@echo "[*] Checking Solana keypair..."
	@if [ ! -f ~/.config/solana/id.json ]; then \
		echo "Generating new keypair..."; \
		solana-keygen new --no-bip39-passphrase -o ~/.config/solana/id.json; \
	else \
		echo "Keypair exists: $$(solana address)"; \
	fi
	@solana config set --url localhost

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

# Check versions
versions:
	@echo "Tool Versions:"
	@echo "  Rust: $$(rustc --version)"
	@echo "  Solana: $$(solana --version)"
	@echo "  Anchor: $$(anchor --version)"
	@echo "  Bun: $$(bun --version)"

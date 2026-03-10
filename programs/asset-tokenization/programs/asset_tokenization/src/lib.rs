#![allow(unexpected_cfgs)]

mod account;
mod error;
mod instructions;
mod state;

use account::*;
use anchor_lang::prelude::*;

declare_id!("EjLLVvxkMtssALhHv4dvKhkxYJQKGmMUcB38DboGMYtJ");

/// # Asset Tokenization Program
/// 
/// A Solana program for tokenizing real-world assets like real estate, gold, 
/// infrastructure, and more. Enables fractional ownership and instant transfers
/// of traditionally illiquid assets.
/// 
/// ## Key Features:
/// - Register real-world assets with document verification
/// - Fractionalize assets into tradeable tokens
/// - Buy/sell fractions with instant settlement
/// - Transfer ownership between parties
/// - Document management for legal compliance
///
/// ## Asset Lifecycle:
/// 1. **Register**: Owner registers asset with metadata and documents
/// 2. **Verify**: Platform authority verifies documents
/// 3. **Tokenize**: Asset is tokenized into fractional tokens
/// 4. **Trade**: Fractions can be bought/sold/transferred
#[program]
pub mod asset_tokenization {
    use super::*;

    /// Initialize the platform configuration.
    /// Only called once by the platform authority.
    pub fn initialize_platform(
        ctx: Context<InitializePlatform>,
        registration_fee: Option<u64>,
        minting_fee_bps: Option<u16>,
        trading_fee_bps: Option<u16>,
    ) -> Result<()> {
        instructions::initialize_platform::handler(
            ctx,
            registration_fee,
            minting_fee_bps,
            trading_fee_bps,
        )
    }

    /// Register a new real-world asset on the platform.
    /// 
    /// # Arguments
    /// * `asset_id` - Unique identifier for this asset
    /// * `asset_type` - Type of asset (0=RealEstate, 1=Gold, 2=Infrastructure, etc.)
    /// * `valuation` - Total valuation in lamports
    /// * `total_fractions` - Number of fractions to divide the asset into
    /// * `metadata_uri` - IPFS/Arweave URI for asset metadata
    /// * `documents_uri` - IPFS/Arweave URI for legal documents
    /// * `location` - Physical location of the asset
    /// * `document_hash` - SHA256 hash of primary document
    pub fn register_asset(
        ctx: Context<RegisterAsset>,
        asset_id: String,
        asset_type: u8,
        valuation: u64,
        total_fractions: u64,
        metadata_uri: String,
        documents_uri: String,
        location: String,
        document_hash: [u8; 32],
    ) -> Result<()> {
        instructions::register_asset::handler(
            ctx,
            asset_id,
            asset_type,
            valuation,
            total_fractions,
            metadata_uri,
            documents_uri,
            location,
            document_hash,
        )
    }

    /// Verify an asset's documents (authority only).
    /// Moves asset from Pending to Verified status.
    pub fn verify_asset(ctx: Context<VerifyAsset>) -> Result<()> {
        instructions::verify_asset::handler(ctx)
    }

    /// Tokenize a verified asset by minting fractional tokens.
    /// 
    /// # Arguments
    /// * `name` - Token name (e.g., "Mumbai Land Token")
    /// * `symbol` - Token symbol (e.g., "MLT")
    /// * `uri` - Token metadata URI
    pub fn tokenize_asset(
        ctx: Context<TokenizeAsset>,
        name: String,
        symbol: String,
        uri: String,
    ) -> Result<()> {
        instructions::tokenize_asset::handler(ctx, name, symbol, uri)
    }

    /// Buy fractions of a tokenized asset.
    /// 
    /// # Arguments
    /// * `fractions_to_buy` - Number of fractions to purchase
    pub fn buy_fractions(ctx: Context<BuyFractions>, fractions_to_buy: u64) -> Result<()> {
        instructions::buy_fractions::handler(ctx, fractions_to_buy)
    }

    /// Sell fractions back to the asset pool.
    /// 
    /// # Arguments
    /// * `fractions_to_sell` - Number of fractions to sell
    pub fn sell_fractions(ctx: Context<SellFractions>, fractions_to_sell: u64) -> Result<()> {
        instructions::sell_fractions::handler(ctx, fractions_to_sell)
    }

    /// Add a document to an asset (owner only).
    /// 
    /// # Arguments
    /// * `doc_type` - Type of document (e.g., "title_deed", "survey")
    /// * `uri` - IPFS/Arweave URI of the document
    /// * `hash` - SHA256 hash of the document
    pub fn add_document(
        ctx: Context<AddDocument>,
        doc_type: String,
        uri: String,
        hash: [u8; 32],
    ) -> Result<()> {
        instructions::add_document::handler(ctx, doc_type, uri, hash)
    }

    /// Update asset metadata (owner only).
    pub fn update_asset(
        ctx: Context<UpdateAsset>,
        new_valuation: Option<u64>,
        new_metadata_uri: Option<String>,
        new_documents_uri: Option<String>,
    ) -> Result<()> {
        instructions::update_asset::handler(ctx, new_valuation, new_metadata_uri, new_documents_uri)
    }

    /// Transfer ownership fractions to another user.
    /// Like UPI but for assets - instant transfer of ownership.
    /// 
    /// # Arguments
    /// * `fractions_to_transfer` - Number of fractions to transfer
    pub fn transfer_ownership(
        ctx: Context<TransferOwnership>,
        fractions_to_transfer: u64,
    ) -> Result<()> {
        instructions::transfer_ownership::handler(ctx, fractions_to_transfer)
    }
}

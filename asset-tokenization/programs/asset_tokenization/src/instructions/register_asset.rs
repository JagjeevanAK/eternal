use anchor_lang::prelude::*;
use anchor_lang::system_program;
use crate::account::RegisterAsset;
use crate::state::{Asset, AssetType, AssetStatus};
use crate::error::AssetError;

pub fn handler(
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
    let config = &mut ctx.accounts.platform_config;
    let asset = &mut ctx.accounts.asset;
    let clock = Clock::get()?;

    // Validate inputs
    require!(
        valuation >= config.min_valuation,
        AssetError::ValuationTooLow
    );
    require!(
        total_fractions <= config.max_fractions,
        AssetError::TooManyFractions
    );
    require!(
        total_fractions >= config.min_fractions,
        AssetError::TooFewFractions
    );
    require!(
        metadata_uri.len() <= Asset::MAX_METADATA_URI_LEN,
        AssetError::MetadataUriTooLong
    );
    require!(
        documents_uri.len() <= Asset::MAX_DOCUMENTS_URI_LEN,
        AssetError::DocumentsUriTooLong
    );
    require!(
        location.len() <= Asset::MAX_LOCATION_LEN,
        AssetError::LocationTooLong
    );
    require!(
        asset_id.len() <= Asset::MAX_ASSET_ID_LEN,
        AssetError::AssetIdTooLong
    );

    // Transfer registration fee to treasury
    let fee_transfer = system_program::Transfer {
        from: ctx.accounts.owner.to_account_info(),
        to: ctx.accounts.treasury.to_account_info(),
    };
    let cpi_ctx = CpiContext::new(
        ctx.accounts.system_program.to_account_info(),
        fee_transfer,
    );
    system_program::transfer(cpi_ctx, config.registration_fee)?;

    // Calculate price per fraction
    let price_per_fraction = valuation
        .checked_div(total_fractions)
        .ok_or(AssetError::InvalidPriceCalculation)?;

    // Initialize asset
    asset.owner = ctx.accounts.owner.key();
    asset.asset_type = match asset_type {
        0 => AssetType::RealEstate,
        1 => AssetType::Gold,
        2 => AssetType::Infrastructure,
        3 => AssetType::Vehicle,
        4 => AssetType::Art,
        5 => AssetType::Commodity,
        _ => AssetType::Other,
    };
    asset.status = AssetStatus::Pending;
    asset.token_mint = Pubkey::default(); // Will be set during tokenization
    asset.valuation = valuation;
    asset.total_fractions = total_fractions;
    asset.available_fractions = total_fractions;
    asset.price_per_fraction = price_per_fraction;
    asset.metadata_uri = metadata_uri;
    asset.documents_uri = documents_uri;
    asset.document_hash = document_hash;
    asset.location = location;
    asset.created_at = clock.unix_timestamp;
    asset.updated_at = clock.unix_timestamp;
    asset.asset_id = asset_id.clone();
    asset.bump = ctx.bumps.asset;

    // Update platform stats
    config.total_assets = config.total_assets.checked_add(1).ok_or(AssetError::Overflow)?;

    msg!("Asset registered: {} with valuation: {} lamports", asset_id, valuation);
    msg!("Total fractions: {}, Price per fraction: {}", total_fractions, price_per_fraction);
    
    Ok(())
}

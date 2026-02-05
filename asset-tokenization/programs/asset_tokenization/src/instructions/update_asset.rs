use anchor_lang::prelude::*;
use crate::account::UpdateAsset;
use crate::state::Asset;
use crate::error::AssetError;

pub fn handler(
    ctx: Context<UpdateAsset>,
    new_valuation: Option<u64>,
    new_metadata_uri: Option<String>,
    new_documents_uri: Option<String>,
) -> Result<()> {
    let asset = &mut ctx.accounts.asset;
    let config = &ctx.accounts.platform_config;
    let clock = Clock::get()?;

    // Update valuation if provided
    if let Some(valuation) = new_valuation {
        require!(
            valuation >= config.min_valuation,
            AssetError::ValuationTooLow
        );
        
        // Recalculate price per fraction
        let new_price = valuation
            .checked_div(asset.total_fractions)
            .ok_or(AssetError::InvalidPriceCalculation)?;
        
        asset.valuation = valuation;
        asset.price_per_fraction = new_price;
        
        msg!("Asset valuation updated to: {}", valuation);
    }

    // Update metadata URI if provided
    if let Some(uri) = new_metadata_uri {
        require!(
            uri.len() <= Asset::MAX_METADATA_URI_LEN,
            AssetError::MetadataUriTooLong
        );
        asset.metadata_uri = uri;
        msg!("Asset metadata URI updated");
    }

    // Update documents URI if provided
    if let Some(uri) = new_documents_uri {
        require!(
            uri.len() <= Asset::MAX_DOCUMENTS_URI_LEN,
            AssetError::DocumentsUriTooLong
        );
        asset.documents_uri = uri;
        msg!("Asset documents URI updated");
    }

    asset.updated_at = clock.unix_timestamp;

    Ok(())
}

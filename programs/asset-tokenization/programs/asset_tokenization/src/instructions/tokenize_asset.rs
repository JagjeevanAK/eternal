use anchor_lang::prelude::*;
use anchor_spl::token;
use anchor_spl::token::MintTo;
use crate::account::TokenizeAsset;
use crate::state::AssetStatus;
use crate::state::config::TOKEN_DECIMALS;

pub fn handler(
    ctx: Context<TokenizeAsset>,
    _name: String,
    _symbol: String,
    _uri: String,
) -> Result<()> {
    let asset = &mut ctx.accounts.asset;
    let clock = Clock::get()?;
    let owner_key = asset.owner;
    let asset_id = asset.asset_id.clone();

    // Calculate tokens to mint (total_fractions * 10^decimals)
    let tokens_to_mint = asset.total_fractions
        .checked_mul(10u64.pow(TOKEN_DECIMALS as u32))
        .ok_or(ErrorCode::InvalidNumericConversion)?;

    // Seeds for asset PDA signing
    let seeds: &[&[u8]] = &[
        b"asset",
        owner_key.as_ref(),
        asset_id.as_bytes(),
        &[asset.bump],
    ];
    let signer_seeds: &[&[&[u8]]] = &[seeds];

    // Mint tokens to asset's token account
    let mint_cpi = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        MintTo {
            mint: ctx.accounts.token_mint.to_account_info(),
            to: ctx.accounts.asset_token_account.to_account_info(),
            authority: asset.to_account_info(),
        },
        signer_seeds,
    );
    token::mint_to(mint_cpi, tokens_to_mint)?;

    // Update asset state
    asset.token_mint = ctx.accounts.token_mint.key();
    asset.status = AssetStatus::Tokenized;
    asset.updated_at = clock.unix_timestamp;

    msg!(
        "Asset {} tokenized with {} fractions. Token mint: {}",
        asset.asset_id,
        asset.total_fractions,
        asset.token_mint
    );

    Ok(())
}

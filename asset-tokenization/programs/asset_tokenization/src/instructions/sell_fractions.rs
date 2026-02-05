use anchor_lang::prelude::*;
use anchor_spl::token;
use crate::account::SellFractions;
use crate::error::AssetError;
use crate::state::config::TOKEN_DECIMALS;

pub fn handler(ctx: Context<SellFractions>, fractions_to_sell: u64) -> Result<()> {
    let config = &mut ctx.accounts.platform_config;
    let asset = &mut ctx.accounts.asset;
    let ownership = &mut ctx.accounts.ownership;

    require!(fractions_to_sell > 0, AssetError::InvalidFractionAmount);
    require!(
        fractions_to_sell <= ownership.fractions_owned,
        AssetError::InsufficientOwnership
    );

    // Calculate sale proceeds
    let sale_amount = fractions_to_sell
        .checked_mul(asset.price_per_fraction)
        .ok_or(AssetError::Overflow)?;

    // Calculate platform fee
    let platform_fee = sale_amount
        .checked_mul(config.trading_fee_bps as u64)
        .ok_or(AssetError::Overflow)?
        .checked_div(10000)
        .ok_or(AssetError::Overflow)?;

    // Amount seller receives
    let seller_amount = sale_amount
        .checked_sub(platform_fee)
        .ok_or(AssetError::Overflow)?;

    // Calculate token amount
    let token_amount = fractions_to_sell
        .checked_mul(10u64.pow(TOKEN_DECIMALS as u32))
        .ok_or(AssetError::Overflow)?;

    // Transfer tokens from seller back to asset account
    let transfer_cpi = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        token::Transfer {
            from: ctx.accounts.seller_token_account.to_account_info(),
            to: ctx.accounts.asset_token_account.to_account_info(),
            authority: ctx.accounts.seller.to_account_info(),
        },
    );
    token::transfer(transfer_cpi, token_amount)?;

    // Transfer SOL from asset PDA to seller (minus fees)
    // Note: In production, you'd need a liquidity pool or buyer matching system
    // For now, we transfer from the asset PDA's lamports
    let asset_lamports = asset.to_account_info().lamports();
    require!(asset_lamports >= sale_amount, AssetError::InsufficientPayment);

    // Transfer fee to treasury
    asset.sub_lamports(platform_fee)?;
    ctx.accounts.treasury.add_lamports(platform_fee)?;

    // Transfer proceeds to seller
    asset.sub_lamports(seller_amount)?;
    ctx.accounts.seller.add_lamports(seller_amount)?;

    // Update ownership
    ownership.fractions_owned = ownership.fractions_owned
        .checked_sub(fractions_to_sell)
        .ok_or(AssetError::Overflow)?;

    // Update asset available fractions
    asset.available_fractions = asset.available_fractions
        .checked_add(fractions_to_sell)
        .ok_or(AssetError::Overflow)?;

    // Update platform volume
    config.total_volume = config.total_volume
        .checked_add(sale_amount as u128)
        .ok_or(AssetError::Overflow)?;

    msg!(
        "Sold {} fractions of asset {} for {} lamports",
        fractions_to_sell,
        asset.asset_id,
        seller_amount
    );

    Ok(())
}

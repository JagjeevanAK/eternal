use anchor_lang::prelude::*;
use anchor_lang::system_program;
use anchor_spl::token;
use crate::account::BuyFractions;
use crate::error::AssetError;
use crate::state::config::TOKEN_DECIMALS;

pub fn handler(ctx: Context<BuyFractions>, fractions_to_buy: u64) -> Result<()> {
    let config = &mut ctx.accounts.platform_config;
    let asset = &mut ctx.accounts.asset;
    let ownership = &mut ctx.accounts.ownership;
    let clock = Clock::get()?;

    require!(fractions_to_buy > 0, AssetError::InvalidFractionAmount);
    require!(
        fractions_to_buy <= asset.available_fractions,
        AssetError::InsufficientFractions
    );

    // Calculate total cost
    let total_cost = fractions_to_buy
        .checked_mul(asset.price_per_fraction)
        .ok_or(AssetError::Overflow)?;

    // Calculate platform fee
    let platform_fee = total_cost
        .checked_mul(config.trading_fee_bps as u64)
        .ok_or(AssetError::Overflow)?
        .checked_div(10000)
        .ok_or(AssetError::Overflow)?;

    // Amount to asset owner
    let owner_amount = total_cost
        .checked_sub(platform_fee)
        .ok_or(AssetError::Overflow)?;

    // Transfer platform fee to treasury
    let fee_transfer = system_program::Transfer {
        from: ctx.accounts.buyer.to_account_info(),
        to: ctx.accounts.treasury.to_account_info(),
    };
    system_program::transfer(
        CpiContext::new(ctx.accounts.system_program.to_account_info(), fee_transfer),
        platform_fee,
    )?;

    // Transfer payment to asset owner
    let owner_transfer = system_program::Transfer {
        from: ctx.accounts.buyer.to_account_info(),
        to: ctx.accounts.asset_owner.to_account_info(),
    };
    system_program::transfer(
        CpiContext::new(ctx.accounts.system_program.to_account_info(), owner_transfer),
        owner_amount,
    )?;

    // Calculate token amount (fractions * 10^decimals)
    let token_amount = fractions_to_buy
        .checked_mul(10u64.pow(TOKEN_DECIMALS as u32))
        .ok_or(AssetError::Overflow)?;

    // Transfer tokens from asset account to buyer
    let asset_key = asset.key();
    let owner_key = asset.owner;
    let asset_id = asset.asset_id.clone();
    let seeds: &[&[u8]] = &[
        b"asset",
        owner_key.as_ref(),
        asset_id.as_bytes(),
        &[asset.bump],
    ];
    let signer_seeds: &[&[&[u8]]] = &[seeds];

    let transfer_cpi = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        token::Transfer {
            from: ctx.accounts.asset_token_account.to_account_info(),
            to: ctx.accounts.buyer_token_account.to_account_info(),
            authority: asset.to_account_info(),
        },
        signer_seeds,
    );
    token::transfer(transfer_cpi, token_amount)?;

    // Update asset available fractions
    asset.available_fractions = asset.available_fractions
        .checked_sub(fractions_to_buy)
        .ok_or(AssetError::Overflow)?;

    // Update or initialize ownership record
    if ownership.asset == Pubkey::default() {
        // New ownership record
        ownership.asset = asset_key;
        ownership.owner = ctx.accounts.buyer.key();
        ownership.fractions_owned = fractions_to_buy;
        ownership.purchased_at = clock.unix_timestamp;
        ownership.bump = ctx.bumps.ownership;
    } else {
        // Existing ownership - add to position
        ownership.fractions_owned = ownership.fractions_owned
            .checked_add(fractions_to_buy)
            .ok_or(AssetError::Overflow)?;
    }

    // Update platform volume
    config.total_volume = config.total_volume
        .checked_add(total_cost as u128)
        .ok_or(AssetError::Overflow)?;

    msg!(
        "Bought {} fractions of asset {} for {} lamports",
        fractions_to_buy,
        asset.asset_id,
        total_cost
    );

    Ok(())
}

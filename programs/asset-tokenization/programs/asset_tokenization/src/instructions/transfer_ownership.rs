use anchor_lang::prelude::*;
use anchor_spl::token;
use crate::account::TransferOwnership;
use crate::error::AssetError;
use crate::state::config::TOKEN_DECIMALS;

pub fn handler(ctx: Context<TransferOwnership>, fractions_to_transfer: u64) -> Result<()> {
    let from_ownership = &mut ctx.accounts.from_ownership;
    let to_ownership = &mut ctx.accounts.to_ownership;
    let asset = &ctx.accounts.asset;
    let clock = Clock::get()?;

    require!(fractions_to_transfer > 0, AssetError::InvalidFractionAmount);
    require!(
        fractions_to_transfer <= from_ownership.fractions_owned,
        AssetError::InsufficientOwnership
    );

    // Calculate token amount
    let token_amount = fractions_to_transfer
        .checked_mul(10u64.pow(TOKEN_DECIMALS as u32))
        .ok_or(AssetError::Overflow)?;

    // Transfer tokens
    let transfer_cpi = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        token::Transfer {
            from: ctx.accounts.from_token_account.to_account_info(),
            to: ctx.accounts.to_token_account.to_account_info(),
            authority: ctx.accounts.from.to_account_info(),
        },
    );
    token::transfer(transfer_cpi, token_amount)?;

    // Update from ownership
    from_ownership.fractions_owned = from_ownership.fractions_owned
        .checked_sub(fractions_to_transfer)
        .ok_or(AssetError::Overflow)?;

    // Update or initialize to ownership
    if to_ownership.asset == Pubkey::default() {
        to_ownership.asset = asset.key();
        to_ownership.owner = ctx.accounts.to.key();
        to_ownership.fractions_owned = fractions_to_transfer;
        to_ownership.purchased_at = clock.unix_timestamp;
        to_ownership.bump = ctx.bumps.to_ownership;
    } else {
        to_ownership.fractions_owned = to_ownership.fractions_owned
            .checked_add(fractions_to_transfer)
            .ok_or(AssetError::Overflow)?;
    }

    msg!(
        "Transferred {} fractions from {} to {}",
        fractions_to_transfer,
        ctx.accounts.from.key(),
        ctx.accounts.to.key()
    );

    Ok(())
}

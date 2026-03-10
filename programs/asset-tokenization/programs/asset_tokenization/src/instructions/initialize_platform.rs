use anchor_lang::prelude::*;
use crate::account::InitializePlatform;
use crate::state::config::*;

pub fn handler(
    ctx: Context<InitializePlatform>,
    registration_fee: Option<u64>,
    minting_fee_bps: Option<u16>,
    trading_fee_bps: Option<u16>,
) -> Result<()> {
    let config = &mut ctx.accounts.platform_config;
    
    config.authority = ctx.accounts.authority.key();
    config.treasury = ctx.accounts.treasury.key();
    config.registration_fee = registration_fee.unwrap_or(DEFAULT_REGISTRATION_FEE);
    config.minting_fee_bps = minting_fee_bps.unwrap_or(DEFAULT_MINTING_FEE_BPS);
    config.trading_fee_bps = trading_fee_bps.unwrap_or(DEFAULT_TRADING_FEE_BPS);
    config.min_valuation = DEFAULT_MIN_VALUATION;
    config.max_fractions = DEFAULT_MAX_FRACTIONS;
    config.min_fractions = DEFAULT_MIN_FRACTIONS;
    config.total_assets = 0;
    config.total_volume = 0;
    config.paused = false;
    config.bump = ctx.bumps.platform_config;

    msg!("Platform initialized with treasury: {}", config.treasury);
    Ok(())
}

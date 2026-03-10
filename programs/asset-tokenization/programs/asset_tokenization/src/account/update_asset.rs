use anchor_lang::prelude::*;
use crate::state::{Asset, PlatformConfig};
use crate::error::AssetError;

#[derive(Accounts)]
pub struct UpdateAsset<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        seeds = [b"platform-config"],
        bump = platform_config.bump,
        constraint = !platform_config.paused @ AssetError::PlatformPaused
    )]
    pub platform_config: Account<'info, PlatformConfig>,

    #[account(
        mut,
        seeds = [b"asset", owner.key().as_ref(), asset.asset_id.as_bytes()],
        bump = asset.bump,
        constraint = asset.owner == owner.key() @ AssetError::Unauthorized
    )]
    pub asset: Account<'info, Asset>,
}

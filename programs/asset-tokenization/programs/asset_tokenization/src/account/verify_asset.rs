use anchor_lang::prelude::*;
use crate::state::{Asset, PlatformConfig, AssetStatus};
use crate::error::AssetError;

#[derive(Accounts)]
pub struct VerifyAsset<'info> {
    #[account(
        constraint = authority.key() == platform_config.authority @ AssetError::Unauthorized
    )]
    pub authority: Signer<'info>,

    #[account(
        seeds = [b"platform-config"],
        bump = platform_config.bump,
        constraint = !platform_config.paused @ AssetError::PlatformPaused
    )]
    pub platform_config: Account<'info, PlatformConfig>,

    #[account(
        mut,
        seeds = [b"asset", asset.owner.as_ref(), asset.asset_id.as_bytes()],
        bump = asset.bump,
        constraint = asset.status == AssetStatus::Pending @ AssetError::InvalidAssetStatus
    )]
    pub asset: Account<'info, Asset>,
}

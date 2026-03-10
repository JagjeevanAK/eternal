use anchor_lang::prelude::*;
use crate::state::{Asset, PlatformConfig};
use crate::error::AssetError;

#[derive(Accounts)]
#[instruction(
    asset_id: String,
    asset_type: u8,
    valuation: u64,
    total_fractions: u64,
    metadata_uri: String,
    documents_uri: String,
    location: String,
    document_hash: [u8; 32]
)]
pub struct RegisterAsset<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        mut,
        seeds = [b"platform-config"],
        bump = platform_config.bump,
        constraint = !platform_config.paused @ AssetError::PlatformPaused
    )]
    pub platform_config: Account<'info, PlatformConfig>,

    #[account(
        init,
        payer = owner,
        space = Asset::LEN,
        seeds = [b"asset", owner.key().as_ref(), asset_id.as_bytes()],
        bump
    )]
    pub asset: Account<'info, Asset>,

    /// CHECK: Treasury to receive registration fee
    #[account(
        mut,
        constraint = treasury.key() == platform_config.treasury
    )]
    pub treasury: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}

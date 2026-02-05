use anchor_lang::prelude::*;
use crate::state::{Asset, PlatformConfig, Document};
use crate::error::AssetError;

#[derive(Accounts)]
#[instruction(doc_type: String, uri: String, hash: [u8; 32])]
pub struct AddDocument<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        seeds = [b"platform-config"],
        bump = platform_config.bump,
        constraint = !platform_config.paused @ AssetError::PlatformPaused
    )]
    pub platform_config: Account<'info, PlatformConfig>,

    #[account(
        seeds = [b"asset", owner.key().as_ref(), asset.asset_id.as_bytes()],
        bump = asset.bump,
        constraint = asset.owner == owner.key() @ AssetError::Unauthorized
    )]
    pub asset: Account<'info, Asset>,

    #[account(
        init,
        payer = owner,
        space = Document::LEN,
        seeds = [b"document", asset.key().as_ref(), doc_type.as_bytes()],
        bump
    )]
    pub document: Account<'info, Document>,

    pub system_program: Program<'info, System>,
}

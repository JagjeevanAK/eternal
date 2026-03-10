use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};
use anchor_spl::associated_token::AssociatedToken;
use crate::state::{Asset, PlatformConfig, AssetStatus};
use crate::error::AssetError;

#[derive(Accounts)]
pub struct TokenizeAsset<'info> {
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
        mut,
        seeds = [b"asset", owner.key().as_ref(), asset.asset_id.as_bytes()],
        bump = asset.bump,
        constraint = asset.owner == owner.key() @ AssetError::Unauthorized,
        constraint = asset.status == AssetStatus::Verified @ AssetError::AssetNotVerified
    )]
    pub asset: Account<'info, Asset>,

    #[account(
        init,
        payer = owner,
        mint::decimals = 6,
        mint::authority = asset,
    )]
    pub token_mint: Account<'info, Mint>,

    #[account(
        init_if_needed,
        payer = owner,
        associated_token::mint = token_mint,
        associated_token::authority = asset
    )]
    pub asset_token_account: Account<'info, TokenAccount>,

    /// CHECK: Metadata account for the token
    #[account(mut)]
    pub metadata_account: UncheckedAccount<'info>,

    /// CHECK: Token metadata program
    pub token_metadata_program: UncheckedAccount<'info>,
    
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

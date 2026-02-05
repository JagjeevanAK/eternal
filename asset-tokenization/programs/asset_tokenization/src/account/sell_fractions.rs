use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount};
use crate::state::{Asset, PlatformConfig, AssetStatus, Ownership};
use crate::error::AssetError;

#[derive(Accounts)]
pub struct SellFractions<'info> {
    #[account(mut)]
    pub seller: Signer<'info>,

    #[account(
        mut,
        seeds = [b"platform-config"],
        bump = platform_config.bump,
        constraint = !platform_config.paused @ AssetError::PlatformPaused
    )]
    pub platform_config: Account<'info, PlatformConfig>,

    #[account(
        mut,
        seeds = [b"asset", asset.owner.as_ref(), asset.asset_id.as_bytes()],
        bump = asset.bump,
        constraint = asset.status == AssetStatus::Tokenized @ AssetError::InvalidAssetStatus
    )]
    pub asset: Account<'info, Asset>,

    #[account(
        mut,
        associated_token::mint = token_mint,
        associated_token::authority = seller
    )]
    pub seller_token_account: Account<'info, TokenAccount>,

    /// CHECK: Asset PDA token account
    #[account(
        mut,
        constraint = asset_token_account.key() == anchor_spl::associated_token::get_associated_token_address(&asset.key(), &asset.token_mint)
    )]
    pub asset_token_account: Account<'info, TokenAccount>,

    /// CHECK: Token mint
    #[account(
        constraint = token_mint.key() == asset.token_mint
    )]
    pub token_mint: AccountInfo<'info>,

    #[account(
        mut,
        seeds = [b"ownership", asset.key().as_ref(), seller.key().as_ref()],
        bump = ownership.bump,
        constraint = ownership.owner == seller.key() @ AssetError::Unauthorized
    )]
    pub ownership: Account<'info, Ownership>,

    /// CHECK: Treasury for fees
    #[account(
        mut,
        constraint = treasury.key() == platform_config.treasury
    )]
    pub treasury: AccountInfo<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

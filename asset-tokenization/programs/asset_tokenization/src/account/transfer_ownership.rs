use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount};
use anchor_spl::associated_token::AssociatedToken;
use crate::state::{Asset, PlatformConfig, AssetStatus, Ownership};
use crate::error::AssetError;

#[derive(Accounts)]
pub struct TransferOwnership<'info> {
    #[account(mut)]
    pub from: Signer<'info>,

    /// CHECK: Recipient of the ownership transfer
    #[account(mut)]
    pub to: AccountInfo<'info>,

    #[account(
        seeds = [b"platform-config"],
        bump = platform_config.bump,
        constraint = !platform_config.paused @ AssetError::PlatformPaused
    )]
    pub platform_config: Account<'info, PlatformConfig>,

    #[account(
        seeds = [b"asset", asset.owner.as_ref(), asset.asset_id.as_bytes()],
        bump = asset.bump,
        constraint = asset.status == AssetStatus::Tokenized @ AssetError::InvalidAssetStatus
    )]
    pub asset: Account<'info, Asset>,

    #[account(
        mut,
        associated_token::mint = token_mint,
        associated_token::authority = from
    )]
    pub from_token_account: Account<'info, TokenAccount>,

    #[account(
        init_if_needed,
        payer = from,
        associated_token::mint = token_mint,
        associated_token::authority = to
    )]
    pub to_token_account: Account<'info, TokenAccount>,

    /// CHECK: Token mint
    #[account(
        constraint = token_mint.key() == asset.token_mint
    )]
    pub token_mint: AccountInfo<'info>,

    #[account(
        mut,
        seeds = [b"ownership", asset.key().as_ref(), from.key().as_ref()],
        bump = from_ownership.bump,
        constraint = from_ownership.owner == from.key() @ AssetError::Unauthorized
    )]
    pub from_ownership: Account<'info, Ownership>,

    #[account(
        init_if_needed,
        payer = from,
        space = Ownership::LEN,
        seeds = [b"ownership", asset.key().as_ref(), to.key().as_ref()],
        bump
    )]
    pub to_ownership: Account<'info, Ownership>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

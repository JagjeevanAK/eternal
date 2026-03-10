use anchor_lang::prelude::*;
use crate::state::PlatformConfig;

#[derive(Accounts)]
pub struct InitializePlatform<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer = authority,
        space = PlatformConfig::LEN,
        seeds = [b"platform-config"],
        bump
    )]
    pub platform_config: Account<'info, PlatformConfig>,

    /// CHECK: Treasury account to receive fees
    pub treasury: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}

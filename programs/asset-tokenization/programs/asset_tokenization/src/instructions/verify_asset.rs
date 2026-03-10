use anchor_lang::prelude::*;
use crate::account::VerifyAsset;
use crate::state::AssetStatus;

pub fn handler(ctx: Context<VerifyAsset>) -> Result<()> {
    let asset = &mut ctx.accounts.asset;
    let clock = Clock::get()?;

    asset.status = AssetStatus::Verified;
    asset.updated_at = clock.unix_timestamp;

    msg!("Asset {} verified by authority", asset.asset_id);
    Ok(())
}

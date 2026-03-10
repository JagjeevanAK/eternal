use anchor_lang::prelude::*;

#[account]
pub struct PlatformConfig {
    pub authority: Pubkey,
    pub treasury: Pubkey,
    pub settlement_authority: Pubkey,
    pub paused: bool,
    pub primary_fee_bps: u16,
    pub secondary_fee_bps: u16,
    pub issuer_count: u64,
    pub investor_count: u64,
    pub property_count: u64,
    pub offering_count: u64,
    pub listing_count: u64,
    pub trade_count: u64,
    pub distribution_count: u64,
    pub primary_volume_inr_minor: u128,
    pub secondary_volume_inr_minor: u128,
    pub bump: u8,
}

impl PlatformConfig {
    pub const LEN: usize = 32 + 32 + 32 + 1 + 2 + 2 + 8 + 8 + 8 + 8 + 8 + 8 + 8 + 16 + 16 + 1;
}

pub const MAX_BPS: u16 = 10_000;

use anchor_lang::prelude::*;

/// Platform-wide configuration
#[account]
pub struct PlatformConfig {
    /// Authority who can update platform settings
    pub authority: Pubkey,
    
    /// Treasury wallet for platform fees
    pub treasury: Pubkey,
    
    /// Fee for registering an asset (in lamports)
    pub registration_fee: u64,
    
    /// Fee for minting tokens (basis points)
    pub minting_fee_bps: u16,
    
    /// Fee for trading (basis points)
    pub trading_fee_bps: u16,
    
    /// Minimum valuation for assets (in lamports)
    pub min_valuation: u64,
    
    /// Maximum fractions an asset can be divided into
    pub max_fractions: u64,
    
    /// Minimum fractions an asset can be divided into
    pub min_fractions: u64,
    
    /// Total assets registered on platform
    pub total_assets: u64,
    
    /// Total trading volume (in lamports)
    pub total_volume: u128,
    
    /// Whether the platform is paused
    pub paused: bool,
    
    /// PDA bump
    pub bump: u8,
}

impl PlatformConfig {
    pub const LEN: usize = 8 + // discriminator
        32 + // authority
        32 + // treasury
        8 + // registration_fee
        2 + // minting_fee_bps
        2 + // trading_fee_bps
        8 + // min_valuation
        8 + // max_fractions
        8 + // min_fractions
        8 + // total_assets
        16 + // total_volume
        1 + // paused
        1; // bump
}

// Default configuration values
pub const DEFAULT_REGISTRATION_FEE: u64 = 100_000_000; // 0.1 SOL
pub const DEFAULT_MINTING_FEE_BPS: u16 = 100; // 1%
pub const DEFAULT_TRADING_FEE_BPS: u16 = 50; // 0.5%
pub const DEFAULT_MIN_VALUATION: u64 = 1_000_000_000; // 1 SOL minimum
pub const DEFAULT_MAX_FRACTIONS: u64 = 1_000_000_000; // 1 billion fractions max
pub const DEFAULT_MIN_FRACTIONS: u64 = 100; // 100 fractions minimum

pub const TOKEN_DECIMALS: u8 = 6;

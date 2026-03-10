use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
#[repr(u8)]
pub enum KycStatus {
    Pending = 0,
    Approved = 1,
    Rejected = 2,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
#[repr(u8)]
pub enum AssetClass {
    RealEstate = 0,
    CompanyShare = 1,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
#[repr(u8)]
pub enum PropertyStatus {
    Review = 0,
    Approved = 1,
    Live = 2,
    Closed = 3,
    Rejected = 4,
    Suspended = 5,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
#[repr(u8)]
pub enum OfferingStatus {
    Review = 0,
    Live = 1,
    Closed = 2,
    Suspended = 3,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
#[repr(u8)]
pub enum ListingStatus {
    Active = 0,
    PartiallyFilled = 1,
    Filled = 2,
    Cancelled = 3,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
#[repr(u8)]
pub enum DistributionStatus {
    Announced = 0,
    Paid = 1,
}

#[account]
pub struct IssuerProfile {
    pub authority: Pubkey,
    pub display_name: String,
    pub city: String,
    pub approved: bool,
    pub suspended: bool,
    pub property_count: u64,
    pub created_at: i64,
    pub updated_at: i64,
    pub bump: u8,
}

impl IssuerProfile {
    pub const MAX_DISPLAY_NAME_LEN: usize = 64;
    pub const MAX_CITY_LEN: usize = 32;

    pub const LEN: usize =
        32 + 4 + Self::MAX_DISPLAY_NAME_LEN + 4 + Self::MAX_CITY_LEN + 1 + 1 + 8 + 8 + 8 + 1;
}

#[account]
pub struct InvestorRegistry {
    pub authority: Pubkey,
    pub legal_name: String,
    pub pan_last4: String,
    pub wallet: Pubkey,
    pub kyc_status: KycStatus,
    pub allowlisted: bool,
    pub frozen: bool,
    pub created_at: i64,
    pub updated_at: i64,
    pub bump: u8,
}

impl InvestorRegistry {
    pub const MAX_LEGAL_NAME_LEN: usize = 64;
    pub const MAX_PAN_LAST4_LEN: usize = 4;

    pub const LEN: usize = 32
        + 4
        + Self::MAX_LEGAL_NAME_LEN
        + 4
        + Self::MAX_PAN_LAST4_LEN
        + 32
        + 1
        + 1
        + 1
        + 8
        + 8
        + 1;

    pub fn is_approved(&self) -> bool {
        self.allowlisted && self.kyc_status == KycStatus::Approved && !self.frozen
    }
}

#[account]
pub struct PropertyProject {
    pub issuer: Pubkey,
    pub code: String,
    pub asset_class: AssetClass,
    pub asset_type: String,
    pub symbol: String,
    pub name: String,
    pub city: String,
    pub state: String,
    pub structure_name: String,
    pub target_yield_bps: u16,
    pub target_irr_bps: u16,
    pub expected_exit_months: u16,
    pub status: PropertyStatus,
    pub created_at: i64,
    pub approved_at: Option<i64>,
    pub live_at: Option<i64>,
    pub updated_at: i64,
    pub total_units: u64,
    pub issued_units: u64,
    pub offering: Pubkey,
    pub bump: u8,
}

impl PropertyProject {
    pub const MAX_CODE_LEN: usize = 32;
    pub const MAX_ASSET_TYPE_LEN: usize = 32;
    pub const MAX_SYMBOL_LEN: usize = 16;
    pub const MAX_NAME_LEN: usize = 64;
    pub const MAX_CITY_LEN: usize = 32;
    pub const MAX_STATE_LEN: usize = 32;
    pub const MAX_STRUCTURE_NAME_LEN: usize = 64;

    pub const LEN: usize = 32
        + 4
        + Self::MAX_CODE_LEN
        + 1
        + 4
        + Self::MAX_ASSET_TYPE_LEN
        + 4
        + Self::MAX_SYMBOL_LEN
        + 4
        + Self::MAX_NAME_LEN
        + 4
        + Self::MAX_CITY_LEN
        + 4
        + Self::MAX_STATE_LEN
        + 4
        + Self::MAX_STRUCTURE_NAME_LEN
        + 2
        + 2
        + 2
        + 1
        + 8
        + 1
        + 8
        + 1
        + 8
        + 8
        + 8
        + 32
        + 1;
}

#[account]
pub struct Offering {
    pub property: Pubkey,
    pub issuer: Pubkey,
    pub minimum_investment_inr_minor: u64,
    pub unit_price_inr_minor: u64,
    pub total_units: u64,
    pub remaining_units: u64,
    pub status: OfferingStatus,
    pub published_at: Option<i64>,
    pub closed_at: Option<i64>,
    pub created_at: i64,
    pub updated_at: i64,
    pub bump: u8,
}

impl Offering {
    pub const LEN: usize = 32 + 32 + 8 + 8 + 8 + 8 + 1 + 1 + 8 + 1 + 8 + 8 + 8 + 1;
}

#[account]
pub struct HoldingPosition {
    pub property: Pubkey,
    pub investor: Pubkey,
    pub units: u64,
    pub listed_units: u64,
    pub average_price_inr_minor: u64,
    pub invested_amount_inr_minor: u64,
    pub created_at: i64,
    pub updated_at: i64,
    pub bump: u8,
}

impl HoldingPosition {
    pub const LEN: usize = 32 + 32 + 8 + 8 + 8 + 8 + 8 + 8 + 1;
}

#[account]
pub struct SecondaryListing {
    pub property: Pubkey,
    pub offering: Pubkey,
    pub seller: Pubkey,
    pub listing_id: u64,
    pub units_listed: u64,
    pub units_remaining: u64,
    pub price_per_unit_inr_minor: u64,
    pub status: ListingStatus,
    pub created_at: i64,
    pub updated_at: i64,
    pub bump: u8,
}

impl SecondaryListing {
    pub const LEN: usize = 32 + 32 + 32 + 8 + 8 + 8 + 8 + 1 + 8 + 8 + 1;
}

#[account]
pub struct TradeRecord {
    pub listing: Pubkey,
    pub property: Pubkey,
    pub buyer: Pubkey,
    pub seller: Pubkey,
    pub units: u64,
    pub price_per_unit_inr_minor: u64,
    pub gross_amount_inr_minor: u64,
    pub fee_amount_inr_minor: u64,
    pub executed_at: i64,
    pub bump: u8,
}

impl TradeRecord {
    pub const LEN: usize = 32 + 32 + 32 + 32 + 8 + 8 + 8 + 8 + 8 + 1;
}

#[account]
pub struct Distribution {
    pub property: Pubkey,
    pub authority: Pubkey,
    pub distribution_id: u64,
    pub amount_per_unit_inr_minor: u64,
    pub total_units_snapshot: u64,
    pub total_amount_inr_minor: u64,
    pub total_claimed_inr_minor: u64,
    pub status: DistributionStatus,
    pub created_at: i64,
    pub payable_at: i64,
    pub bump: u8,
}

impl Distribution {
    pub const LEN: usize = 32 + 32 + 8 + 8 + 8 + 8 + 8 + 1 + 8 + 8 + 1;
}

#[account]
pub struct DistributionClaim {
    pub distribution: Pubkey,
    pub investor: Pubkey,
    pub amount_inr_minor: u64,
    pub claimed_at: i64,
    pub bump: u8,
}

impl DistributionClaim {
    pub const LEN: usize = 32 + 32 + 8 + 8 + 1;
}

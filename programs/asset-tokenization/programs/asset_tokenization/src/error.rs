use anchor_lang::prelude::*;

#[error_code]
pub enum AssetError {
    #[msg("Platform is currently paused")]
    PlatformPaused,

    #[msg("Not authorized to perform this action")]
    Unauthorized,

    #[msg("Basis point value is invalid")]
    InvalidFeeBps,

    #[msg("Numeric overflow occurred")]
    Overflow,

    #[msg("Units must be greater than zero")]
    InvalidUnits,

    #[msg("Amount must be greater than zero")]
    InvalidAmount,

    #[msg("Timestamp is invalid for this action")]
    InvalidTimestamp,

    #[msg("Asset or product state is invalid for this action")]
    InvalidAssetStatus,

    #[msg("A code exceeds the supported length")]
    CodeTooLong,

    #[msg("A name exceeds the supported length")]
    NameTooLong,

    #[msg("Asset type exceeds the supported length")]
    AssetTypeTooLong,

    #[msg("Symbol exceeds the supported length")]
    SymbolTooLong,

    #[msg("City exceeds the supported length")]
    CityTooLong,

    #[msg("State exceeds the supported length")]
    StateTooLong,

    #[msg("Structure name exceeds the supported length")]
    StructureNameTooLong,

    #[msg("PAN suffix must be 4 characters or fewer")]
    PanTooLong,

    #[msg("The issuer is not approved for this action")]
    IssuerNotApproved,

    #[msg("The investor is not approved for this action")]
    InvestorNotApproved,

    #[msg("The investor is currently frozen")]
    InvestorFrozen,

    #[msg("The asset has not reached an approved state")]
    PropertyNotApproved,

    #[msg("The offering is not awaiting publication")]
    OfferingNotReview,

    #[msg("The offering is not live")]
    OfferingNotLive,

    #[msg("An offering already exists for this asset")]
    OfferingAlreadyExists,

    #[msg("The listing is not active")]
    ListingNotActive,

    #[msg("Insufficient available units remain")]
    InsufficientAvailableUnits,

    #[msg("Insufficient holding units remain")]
    InsufficientOwnership,

    #[msg("There are no eligible units to claim against")]
    NothingToClaim,
}

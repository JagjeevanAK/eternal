use anchor_lang::prelude::*;

#[error_code]
pub enum AssetError {
    #[msg("Platform is currently paused")]
    PlatformPaused,
    
    #[msg("Asset valuation is below minimum threshold")]
    ValuationTooLow,
    
    #[msg("Number of fractions exceeds maximum allowed")]
    TooManyFractions,
    
    #[msg("Number of fractions is below minimum allowed")]
    TooFewFractions,
    
    #[msg("Asset is not in the correct status for this operation")]
    InvalidAssetStatus,
    
    #[msg("Asset must be verified before tokenization")]
    AssetNotVerified,
    
    #[msg("Asset is already tokenized")]
    AlreadyTokenized,
    
    #[msg("Insufficient fractions available")]
    InsufficientFractions,
    
    #[msg("Insufficient payment amount")]
    InsufficientPayment,
    
    #[msg("Invalid price calculation")]
    InvalidPriceCalculation,
    
    #[msg("Not authorized to perform this action")]
    Unauthorized,
    
    #[msg("Invalid document hash")]
    InvalidDocumentHash,
    
    #[msg("Metadata URI too long")]
    MetadataUriTooLong,
    
    #[msg("Documents URI too long")]
    DocumentsUriTooLong,
    
    #[msg("Location string too long")]
    LocationTooLong,
    
    #[msg("Asset ID too long")]
    AssetIdTooLong,
    
    #[msg("Document type too long")]
    DocTypeTooLong,
    
    #[msg("Document URI too long")]
    DocUriTooLong,
    
    #[msg("Numeric overflow occurred")]
    Overflow,
    
    #[msg("Asset is frozen and cannot be traded")]
    AssetFrozen,
    
    #[msg("Cannot sell more fractions than owned")]
    InsufficientOwnership,
    
    #[msg("Invalid fraction amount")]
    InvalidFractionAmount,
}

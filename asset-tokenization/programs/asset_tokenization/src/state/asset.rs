use anchor_lang::prelude::*;

/// Types of real-world assets that can be tokenized
#[derive(AnchorDeserialize, AnchorSerialize, Clone, Copy, PartialEq, Eq)]
#[repr(u8)]
pub enum AssetType {
    RealEstate = 0,    // Land, buildings, apartments
    Gold = 1,          // Gold bars, coins
    Infrastructure = 2, // Roads, bridges, power plants
    Vehicle = 3,       // Cars, trucks, machinery
    Art = 4,           // Paintings, sculptures
    Commodity = 5,     // Other commodities
    Other = 6,
}

/// Status of the asset in the tokenization lifecycle
#[derive(AnchorDeserialize, AnchorSerialize, Clone, Copy, PartialEq, Eq)]
#[repr(u8)]
pub enum AssetStatus {
    Pending = 0,       // Awaiting document verification
    Verified = 1,      // Documents verified, ready for tokenization
    Tokenized = 2,     // Tokens have been minted
    Frozen = 3,        // Asset frozen (dispute, legal, etc.)
    Delisted = 4,      // Asset removed from platform
}

/// Main asset account representing a real-world asset
#[account]
pub struct Asset {
    /// Owner of the asset (original asset holder)
    pub owner: Pubkey,
    
    /// Type of asset
    pub asset_type: AssetType,
    
    /// Current status of the asset
    pub status: AssetStatus,
    
    /// Token mint for this asset's fractions
    pub token_mint: Pubkey,
    
    /// Total valuation of the asset in lamports (SOL equivalent)
    pub valuation: u64,
    
    /// Total number of fractions (tokens) this asset is divided into
    pub total_fractions: u64,
    
    /// Number of fractions currently available for purchase
    pub available_fractions: u64,
    
    /// Price per fraction in lamports
    pub price_per_fraction: u64,
    
    /// URI pointing to asset metadata (IPFS/Arweave)
    pub metadata_uri: String,
    
    /// URI pointing to legal documents (IPFS/Arweave)
    pub documents_uri: String,
    
    /// Hash of the primary document for verification
    pub document_hash: [u8; 32],
    
    /// Location/address of the physical asset (for real estate)
    pub location: String,
    
    /// Timestamp when asset was registered
    pub created_at: i64,
    
    /// Timestamp of last update
    pub updated_at: i64,
    
    /// Unique identifier/seed for this asset
    pub asset_id: String,
    
    /// PDA bump
    pub bump: u8,
}

impl Asset {
    pub const MAX_METADATA_URI_LEN: usize = 200;
    pub const MAX_DOCUMENTS_URI_LEN: usize = 200;
    pub const MAX_LOCATION_LEN: usize = 200;
    pub const MAX_ASSET_ID_LEN: usize = 50;
    
    pub const LEN: usize = 8 + // discriminator
        32 + // owner
        1 + // asset_type
        1 + // status
        32 + // token_mint
        8 + // valuation
        8 + // total_fractions
        8 + // available_fractions
        8 + // price_per_fraction
        4 + Self::MAX_METADATA_URI_LEN + // metadata_uri (string prefix + max len)
        4 + Self::MAX_DOCUMENTS_URI_LEN + // documents_uri
        32 + // document_hash
        4 + Self::MAX_LOCATION_LEN + // location
        8 + // created_at
        8 + // updated_at
        4 + Self::MAX_ASSET_ID_LEN + // asset_id
        1; // bump
}

/// Represents ownership stake in an asset
#[account]
pub struct Ownership {
    /// The asset this ownership relates to
    pub asset: Pubkey,
    
    /// The owner of this stake
    pub owner: Pubkey,
    
    /// Number of fractions owned
    pub fractions_owned: u64,
    
    /// Timestamp of purchase
    pub purchased_at: i64,
    
    /// PDA bump
    pub bump: u8,
}

impl Ownership {
    pub const LEN: usize = 8 + 32 + 32 + 8 + 8 + 1;
}

/// Document verification record
#[account]
pub struct Document {
    /// The asset this document belongs to
    pub asset: Pubkey,
    
    /// Type of document (e.g., "title_deed", "survey", "valuation_report")
    pub doc_type: String,
    
    /// IPFS/Arweave URI of the document
    pub uri: String,
    
    /// SHA256 hash of the document for verification
    pub hash: [u8; 32],
    
    /// Whether this document has been verified
    pub verified: bool,
    
    /// Optional verifier public key
    pub verifier: Option<Pubkey>,
    
    /// Timestamp when uploaded
    pub uploaded_at: i64,
    
    /// Timestamp when verified
    pub verified_at: Option<i64>,
    
    /// PDA bump
    pub bump: u8,
}

impl Document {
    pub const MAX_DOC_TYPE_LEN: usize = 50;
    pub const MAX_URI_LEN: usize = 200;
    
    pub const LEN: usize = 8 + 
        32 + // asset
        4 + Self::MAX_DOC_TYPE_LEN + // doc_type
        4 + Self::MAX_URI_LEN + // uri
        32 + // hash
        1 + // verified
        1 + 32 + // verifier (Option<Pubkey>)
        8 + // uploaded_at
        1 + 8 + // verified_at (Option<i64>)
        1; // bump
}

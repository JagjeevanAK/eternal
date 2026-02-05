use anchor_lang::prelude::*;
use crate::account::AddDocument;
use crate::state::Document;
use crate::error::AssetError;

pub fn handler(
    ctx: Context<AddDocument>,
    doc_type: String,
    uri: String,
    hash: [u8; 32],
) -> Result<()> {
    let document = &mut ctx.accounts.document;
    let clock = Clock::get()?;

    require!(
        doc_type.len() <= Document::MAX_DOC_TYPE_LEN,
        AssetError::DocTypeTooLong
    );
    require!(
        uri.len() <= Document::MAX_URI_LEN,
        AssetError::DocUriTooLong
    );

    document.asset = ctx.accounts.asset.key();
    document.doc_type = doc_type.clone();
    document.uri = uri.clone();
    document.hash = hash;
    document.verified = false;
    document.verifier = None;
    document.uploaded_at = clock.unix_timestamp;
    document.verified_at = None;
    document.bump = ctx.bumps.document;

    msg!(
        "Document '{}' added to asset {}",
        doc_type,
        ctx.accounts.asset.asset_id
    );

    Ok(())
}

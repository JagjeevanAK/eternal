#![allow(unexpected_cfgs)]

mod error;
mod state;

use anchor_lang::prelude::*;
use error::AssetError;
use state::*;

declare_id!("EjLLVvxkMtssALhHv4dvKhkxYJQKGmMUcB38DboGMYtJ");

#[program]
pub mod asset_tokenization {
    use super::*;

    pub fn initialize_platform(
        ctx: Context<InitializePlatform>,
        primary_fee_bps: u16,
        secondary_fee_bps: u16,
    ) -> Result<()> {
        validate_fee_bps(primary_fee_bps)?;
        validate_fee_bps(secondary_fee_bps)?;

        let platform = &mut ctx.accounts.platform_config;
        platform.authority = ctx.accounts.authority.key();
        platform.treasury = ctx.accounts.treasury.key();
        platform.settlement_authority = ctx.accounts.authority.key();
        platform.paused = false;
        platform.primary_fee_bps = primary_fee_bps;
        platform.secondary_fee_bps = secondary_fee_bps;
        platform.issuer_count = 0;
        platform.investor_count = 0;
        platform.property_count = 0;
        platform.offering_count = 0;
        platform.listing_count = 0;
        platform.trade_count = 0;
        platform.distribution_count = 0;
        platform.primary_volume_inr_minor = 0;
        platform.secondary_volume_inr_minor = 0;
        platform.bump = ctx.bumps.platform_config;
        Ok(())
    }

    pub fn set_platform_pause(ctx: Context<SetPlatformPause>, paused: bool) -> Result<()> {
        require_authority(&ctx.accounts.platform_config, &ctx.accounts.authority)?;
        ctx.accounts.platform_config.paused = paused;
        Ok(())
    }

    pub fn register_issuer(
        ctx: Context<RegisterIssuer>,
        display_name: String,
        city: String,
    ) -> Result<()> {
        require_not_paused(&ctx.accounts.platform_config)?;
        validate_name(&display_name)?;
        validate_city(&city)?;

        let now = Clock::get()?.unix_timestamp;
        let issuer = &mut ctx.accounts.issuer_profile;
        issuer.authority = ctx.accounts.authority.key();
        issuer.display_name = display_name;
        issuer.city = city;
        issuer.approved = false;
        issuer.suspended = false;
        issuer.property_count = 0;
        issuer.created_at = now;
        issuer.updated_at = now;
        issuer.bump = ctx.bumps.issuer_profile;

        ctx.accounts.platform_config.issuer_count = ctx
            .accounts
            .platform_config
            .issuer_count
            .checked_add(1)
            .ok_or(error!(AssetError::Overflow))?;

        Ok(())
    }

    pub fn approve_issuer(ctx: Context<ApproveIssuer>) -> Result<()> {
        require_authority(&ctx.accounts.platform_config, &ctx.accounts.authority)?;
        let issuer = &mut ctx.accounts.issuer_profile;
        issuer.approved = true;
        issuer.suspended = false;
        issuer.updated_at = Clock::get()?.unix_timestamp;
        Ok(())
    }

    pub fn register_investor(
        ctx: Context<RegisterInvestor>,
        legal_name: String,
        pan_last4: String,
        wallet: Pubkey,
    ) -> Result<()> {
        require_not_paused(&ctx.accounts.platform_config)?;
        validate_name(&legal_name)?;
        validate_pan_last4(&pan_last4)?;

        let now = Clock::get()?.unix_timestamp;
        let investor = &mut ctx.accounts.investor_registry;
        investor.authority = ctx.accounts.authority.key();
        investor.legal_name = legal_name;
        investor.pan_last4 = pan_last4;
        investor.wallet = wallet;
        investor.kyc_status = KycStatus::Pending;
        investor.allowlisted = false;
        investor.frozen = false;
        investor.created_at = now;
        investor.updated_at = now;
        investor.bump = ctx.bumps.investor_registry;

        ctx.accounts.platform_config.investor_count = ctx
            .accounts
            .platform_config
            .investor_count
            .checked_add(1)
            .ok_or(error!(AssetError::Overflow))?;

        Ok(())
    }

    pub fn bind_investor_wallet(ctx: Context<BindInvestorWallet>, wallet: Pubkey) -> Result<()> {
        require_not_paused(&ctx.accounts.platform_config)?;
        let investor = &mut ctx.accounts.investor_registry;
        investor.wallet = wallet;
        investor.updated_at = Clock::get()?.unix_timestamp;
        Ok(())
    }

    pub fn approve_investor(ctx: Context<ApproveInvestor>) -> Result<()> {
        require_authority(&ctx.accounts.platform_config, &ctx.accounts.authority)?;
        let investor = &mut ctx.accounts.investor_registry;
        investor.allowlisted = true;
        investor.frozen = false;
        investor.kyc_status = KycStatus::Approved;
        investor.updated_at = Clock::get()?.unix_timestamp;
        Ok(())
    }

    pub fn set_investor_frozen(ctx: Context<SetInvestorFrozen>, frozen: bool) -> Result<()> {
        require_authority(&ctx.accounts.platform_config, &ctx.accounts.authority)?;
        let investor = &mut ctx.accounts.investor_registry;
        investor.frozen = frozen;
        investor.updated_at = Clock::get()?.unix_timestamp;
        Ok(())
    }

    #[allow(clippy::too_many_arguments)]
    pub fn submit_asset(
        ctx: Context<SubmitAsset>,
        code: String,
        asset_class: AssetClass,
        asset_type: String,
        symbol: String,
        name: String,
        city: String,
        state_name: String,
        structure_name: String,
        target_yield_bps: u16,
        target_irr_bps: u16,
        expected_exit_months: u16,
    ) -> Result<()> {
        require_not_paused(&ctx.accounts.platform_config)?;
        require!(
            ctx.accounts.issuer_profile.approved && !ctx.accounts.issuer_profile.suspended,
            AssetError::IssuerNotApproved
        );
        validate_code(&code)?;
        validate_asset_type(&asset_type)?;
        validate_symbol(&symbol)?;
        validate_property_name(&name)?;
        validate_city(&city)?;
        validate_state(&state_name)?;
        validate_structure_name(&structure_name)?;

        let now = Clock::get()?.unix_timestamp;
        let property = &mut ctx.accounts.property;
        property.issuer = ctx.accounts.authority.key();
        property.code = code;
        property.asset_class = asset_class;
        property.asset_type = asset_type;
        property.symbol = symbol;
        property.name = name;
        property.city = city;
        property.state = state_name;
        property.structure_name = structure_name;
        property.target_yield_bps = target_yield_bps;
        property.target_irr_bps = target_irr_bps;
        property.expected_exit_months = expected_exit_months;
        property.status = PropertyStatus::Review;
        property.created_at = now;
        property.approved_at = None;
        property.live_at = None;
        property.updated_at = now;
        property.total_units = 0;
        property.issued_units = 0;
        property.offering = Pubkey::default();
        property.bump = ctx.bumps.property;

        ctx.accounts.issuer_profile.property_count = ctx
            .accounts
            .issuer_profile
            .property_count
            .checked_add(1)
            .ok_or(error!(AssetError::Overflow))?;
        ctx.accounts.issuer_profile.updated_at = now;
        ctx.accounts.platform_config.property_count = ctx
            .accounts
            .platform_config
            .property_count
            .checked_add(1)
            .ok_or(error!(AssetError::Overflow))?;

        Ok(())
    }

    pub fn create_offering(
        ctx: Context<CreateOffering>,
        minimum_investment_inr_minor: u64,
        unit_price_inr_minor: u64,
        total_units: u64,
    ) -> Result<()> {
        require_not_paused(&ctx.accounts.platform_config)?;
        require!(
            ctx.accounts.issuer_profile.approved && !ctx.accounts.issuer_profile.suspended,
            AssetError::IssuerNotApproved
        );
        require!(minimum_investment_inr_minor > 0, AssetError::InvalidAmount);
        require!(unit_price_inr_minor > 0, AssetError::InvalidAmount);
        require!(total_units > 0, AssetError::InvalidUnits);
        require!(
            ctx.accounts.property.offering == Pubkey::default(),
            AssetError::OfferingAlreadyExists
        );

        let now = Clock::get()?.unix_timestamp;
        let offering = &mut ctx.accounts.offering;
        offering.property = ctx.accounts.property.key();
        offering.issuer = ctx.accounts.authority.key();
        offering.minimum_investment_inr_minor = minimum_investment_inr_minor;
        offering.unit_price_inr_minor = unit_price_inr_minor;
        offering.total_units = total_units;
        offering.remaining_units = total_units;
        offering.status = OfferingStatus::Review;
        offering.published_at = None;
        offering.closed_at = None;
        offering.created_at = now;
        offering.updated_at = now;
        offering.bump = ctx.bumps.offering;

        let property = &mut ctx.accounts.property;
        property.total_units = total_units;
        property.offering = offering.key();
        property.updated_at = now;

        ctx.accounts.platform_config.offering_count = ctx
            .accounts
            .platform_config
            .offering_count
            .checked_add(1)
            .ok_or(error!(AssetError::Overflow))?;

        Ok(())
    }

    pub fn approve_asset(ctx: Context<ApproveAsset>) -> Result<()> {
        require_authority(&ctx.accounts.platform_config, &ctx.accounts.authority)?;
        let now = Clock::get()?.unix_timestamp;
        let property = &mut ctx.accounts.property;
        property.status = PropertyStatus::Approved;
        property.approved_at = Some(now);
        property.updated_at = now;
        Ok(())
    }

    pub fn publish_offering(ctx: Context<PublishOffering>) -> Result<()> {
        require_authority(&ctx.accounts.platform_config, &ctx.accounts.authority)?;
        require!(
            ctx.accounts.property.status == PropertyStatus::Approved,
            AssetError::PropertyNotApproved
        );
        require!(
            ctx.accounts.offering.status == OfferingStatus::Review,
            AssetError::OfferingNotReview
        );

        let now = Clock::get()?.unix_timestamp;
        ctx.accounts.offering.status = OfferingStatus::Live;
        ctx.accounts.offering.published_at = Some(now);
        ctx.accounts.offering.updated_at = now;
        ctx.accounts.property.status = PropertyStatus::Live;
        ctx.accounts.property.live_at = Some(now);
        ctx.accounts.property.updated_at = now;
        Ok(())
    }

    pub fn close_offering(ctx: Context<CloseOffering>) -> Result<()> {
        require_authority(&ctx.accounts.platform_config, &ctx.accounts.authority)?;
        let now = Clock::get()?.unix_timestamp;
        ctx.accounts.offering.status = OfferingStatus::Closed;
        ctx.accounts.offering.closed_at = Some(now);
        ctx.accounts.offering.updated_at = now;
        ctx.accounts.property.status = PropertyStatus::Closed;
        ctx.accounts.property.updated_at = now;
        Ok(())
    }

    pub fn allocate_primary(ctx: Context<AllocatePrimary>, units: u64) -> Result<()> {
        require_settlement_authority(&ctx.accounts.platform_config, &ctx.accounts.authority)?;
        require_not_paused(&ctx.accounts.platform_config)?;
        require!(units > 0, AssetError::InvalidUnits);
        ensure_investor_active(&ctx.accounts.investor_registry)?;
        require!(
            ctx.accounts.offering.status == OfferingStatus::Live,
            AssetError::OfferingNotLive
        );
        require!(
            ctx.accounts.offering.remaining_units >= units,
            AssetError::InsufficientAvailableUnits
        );

        let gross_amount = units
            .checked_mul(ctx.accounts.offering.unit_price_inr_minor)
            .ok_or(error!(AssetError::Overflow))?;
        require!(
            gross_amount >= ctx.accounts.offering.minimum_investment_inr_minor,
            AssetError::InvalidAmount
        );

        let now = Clock::get()?.unix_timestamp;
        initialize_holding_if_needed(
            &mut ctx.accounts.holding,
            ctx.accounts.property.key(),
            ctx.accounts.investor.key(),
            ctx.bumps.holding,
            now,
        );

        let updated_units = ctx
            .accounts
            .holding
            .units
            .checked_add(units)
            .ok_or(error!(AssetError::Overflow))?;
        let updated_invested = ctx
            .accounts
            .holding
            .invested_amount_inr_minor
            .checked_add(gross_amount)
            .ok_or(error!(AssetError::Overflow))?;
        ctx.accounts.holding.units = updated_units;
        ctx.accounts.holding.invested_amount_inr_minor = updated_invested;
        ctx.accounts.holding.average_price_inr_minor = updated_invested
            .checked_div(updated_units)
            .ok_or(error!(AssetError::Overflow))?;
        ctx.accounts.holding.updated_at = now;

        ctx.accounts.offering.remaining_units = ctx
            .accounts
            .offering
            .remaining_units
            .checked_sub(units)
            .ok_or(error!(AssetError::Overflow))?;
        ctx.accounts.offering.updated_at = now;
        if ctx.accounts.offering.remaining_units == 0 {
            ctx.accounts.offering.status = OfferingStatus::Closed;
            ctx.accounts.offering.closed_at = Some(now);
        }

        ctx.accounts.property.issued_units = ctx
            .accounts
            .property
            .issued_units
            .checked_add(units)
            .ok_or(error!(AssetError::Overflow))?;
        ctx.accounts.property.updated_at = now;

        ctx.accounts.platform_config.primary_volume_inr_minor = ctx
            .accounts
            .platform_config
            .primary_volume_inr_minor
            .checked_add(gross_amount as u128)
            .ok_or(error!(AssetError::Overflow))?;

        Ok(())
    }

    pub fn create_listing(
        ctx: Context<CreateListing>,
        listing_id: u64,
        units: u64,
        price_per_unit_inr_minor: u64,
    ) -> Result<()> {
        require_not_paused(&ctx.accounts.platform_config)?;
        require!(units > 0, AssetError::InvalidUnits);
        require!(price_per_unit_inr_minor > 0, AssetError::InvalidAmount);
        ensure_investor_active(&ctx.accounts.seller_registry)?;
        require!(
            ctx.accounts.offering.status == OfferingStatus::Live
                || ctx.accounts.offering.status == OfferingStatus::Closed,
            AssetError::OfferingNotLive
        );
        require!(
            listing_id == ctx.accounts.platform_config.listing_count + 1,
            AssetError::InvalidAssetStatus
        );

        let available_units = available_holding_units(&ctx.accounts.seller_holding)?;
        require!(available_units >= units, AssetError::InsufficientOwnership);

        let now = Clock::get()?.unix_timestamp;
        ctx.accounts.seller_holding.listed_units = ctx
            .accounts
            .seller_holding
            .listed_units
            .checked_add(units)
            .ok_or(error!(AssetError::Overflow))?;
        ctx.accounts.seller_holding.updated_at = now;

        let listing = &mut ctx.accounts.listing;
        listing.property = ctx.accounts.property.key();
        listing.offering = ctx.accounts.offering.key();
        listing.seller = ctx.accounts.seller.key();
        listing.listing_id = listing_id;
        listing.units_listed = units;
        listing.units_remaining = units;
        listing.price_per_unit_inr_minor = price_per_unit_inr_minor;
        listing.status = ListingStatus::Active;
        listing.created_at = now;
        listing.updated_at = now;
        listing.bump = ctx.bumps.listing;

        ctx.accounts.platform_config.listing_count = listing_id;
        Ok(())
    }

    pub fn fill_listing(ctx: Context<FillListing>, trade_id: u64, units: u64) -> Result<()> {
        require_settlement_authority(&ctx.accounts.platform_config, &ctx.accounts.authority)?;
        require_not_paused(&ctx.accounts.platform_config)?;
        require!(units > 0, AssetError::InvalidUnits);
        require!(
            trade_id == ctx.accounts.platform_config.trade_count + 1,
            AssetError::InvalidAssetStatus
        );
        require!(
            ctx.accounts.buyer.key() != ctx.accounts.seller.key(),
            AssetError::Unauthorized
        );
        ensure_investor_active(&ctx.accounts.buyer_registry)?;
        require!(
            !ctx.accounts.seller_registry.frozen,
            AssetError::InvestorFrozen
        );
        require!(
            ctx.accounts.listing.status == ListingStatus::Active
                || ctx.accounts.listing.status == ListingStatus::PartiallyFilled,
            AssetError::ListingNotActive
        );
        require!(
            ctx.accounts.listing.units_remaining >= units,
            AssetError::InsufficientAvailableUnits
        );

        let gross_amount = units
            .checked_mul(ctx.accounts.listing.price_per_unit_inr_minor)
            .ok_or(error!(AssetError::Overflow))?;
        let fee_amount = ((gross_amount as u128)
            .checked_mul(ctx.accounts.platform_config.secondary_fee_bps as u128)
            .ok_or(error!(AssetError::Overflow))?)
        .checked_div(MAX_BPS as u128)
        .ok_or(error!(AssetError::Overflow))? as u64;

        let now = Clock::get()?.unix_timestamp;
        initialize_holding_if_needed(
            &mut ctx.accounts.buyer_holding,
            ctx.accounts.property.key(),
            ctx.accounts.buyer.key(),
            ctx.bumps.buyer_holding,
            now,
        );

        let seller_cost_basis = ctx
            .accounts
            .seller_holding
            .average_price_inr_minor
            .checked_mul(units)
            .ok_or(error!(AssetError::Overflow))?;
        ctx.accounts.seller_holding.units = ctx
            .accounts
            .seller_holding
            .units
            .checked_sub(units)
            .ok_or(error!(AssetError::Overflow))?;
        ctx.accounts.seller_holding.listed_units = ctx
            .accounts
            .seller_holding
            .listed_units
            .checked_sub(units)
            .ok_or(error!(AssetError::Overflow))?;
        ctx.accounts.seller_holding.invested_amount_inr_minor = ctx
            .accounts
            .seller_holding
            .invested_amount_inr_minor
            .checked_sub(seller_cost_basis)
            .ok_or(error!(AssetError::Overflow))?;
        ctx.accounts.seller_holding.average_price_inr_minor =
            if ctx.accounts.seller_holding.units == 0 {
                0
            } else {
                ctx.accounts
                    .seller_holding
                    .invested_amount_inr_minor
                    .checked_div(ctx.accounts.seller_holding.units)
                    .ok_or(error!(AssetError::Overflow))?
            };
        ctx.accounts.seller_holding.updated_at = now;

        let buyer_units = ctx
            .accounts
            .buyer_holding
            .units
            .checked_add(units)
            .ok_or(error!(AssetError::Overflow))?;
        let buyer_invested = ctx
            .accounts
            .buyer_holding
            .invested_amount_inr_minor
            .checked_add(gross_amount)
            .ok_or(error!(AssetError::Overflow))?;
        ctx.accounts.buyer_holding.units = buyer_units;
        ctx.accounts.buyer_holding.invested_amount_inr_minor = buyer_invested;
        ctx.accounts.buyer_holding.average_price_inr_minor = buyer_invested
            .checked_div(buyer_units)
            .ok_or(error!(AssetError::Overflow))?;
        ctx.accounts.buyer_holding.updated_at = now;

        ctx.accounts.listing.units_remaining = ctx
            .accounts
            .listing
            .units_remaining
            .checked_sub(units)
            .ok_or(error!(AssetError::Overflow))?;
        ctx.accounts.listing.status = if ctx.accounts.listing.units_remaining == 0 {
            ListingStatus::Filled
        } else {
            ListingStatus::PartiallyFilled
        };
        ctx.accounts.listing.updated_at = now;

        let trade = &mut ctx.accounts.trade_record;
        trade.listing = ctx.accounts.listing.key();
        trade.property = ctx.accounts.property.key();
        trade.buyer = ctx.accounts.buyer.key();
        trade.seller = ctx.accounts.seller.key();
        trade.units = units;
        trade.price_per_unit_inr_minor = ctx.accounts.listing.price_per_unit_inr_minor;
        trade.gross_amount_inr_minor = gross_amount;
        trade.fee_amount_inr_minor = fee_amount;
        trade.executed_at = now;
        trade.bump = ctx.bumps.trade_record;

        ctx.accounts.platform_config.trade_count = trade_id;
        ctx.accounts.platform_config.secondary_volume_inr_minor = ctx
            .accounts
            .platform_config
            .secondary_volume_inr_minor
            .checked_add(gross_amount as u128)
            .ok_or(error!(AssetError::Overflow))?;

        Ok(())
    }

    pub fn cancel_listing(ctx: Context<CancelListing>) -> Result<()> {
        require_not_paused(&ctx.accounts.platform_config)?;
        require!(
            ctx.accounts.listing.status == ListingStatus::Active
                || ctx.accounts.listing.status == ListingStatus::PartiallyFilled,
            AssetError::ListingNotActive
        );

        let now = Clock::get()?.unix_timestamp;
        ctx.accounts.seller_holding.listed_units = ctx
            .accounts
            .seller_holding
            .listed_units
            .checked_sub(ctx.accounts.listing.units_remaining)
            .ok_or(error!(AssetError::Overflow))?;
        ctx.accounts.seller_holding.updated_at = now;
        ctx.accounts.listing.units_remaining = 0;
        ctx.accounts.listing.status = ListingStatus::Cancelled;
        ctx.accounts.listing.updated_at = now;
        Ok(())
    }

    pub fn create_distribution(
        ctx: Context<CreateDistribution>,
        distribution_id: u64,
        amount_per_unit_inr_minor: u64,
        payable_at: i64,
    ) -> Result<()> {
        require_authority(&ctx.accounts.platform_config, &ctx.accounts.authority)?;
        require!(
            distribution_id == ctx.accounts.platform_config.distribution_count + 1,
            AssetError::InvalidAssetStatus
        );
        require!(amount_per_unit_inr_minor > 0, AssetError::InvalidAmount);

        let now = Clock::get()?.unix_timestamp;
        require!(payable_at >= now, AssetError::InvalidTimestamp);

        let total_amount = ctx
            .accounts
            .property
            .issued_units
            .checked_mul(amount_per_unit_inr_minor)
            .ok_or(error!(AssetError::Overflow))?;

        let distribution = &mut ctx.accounts.distribution;
        distribution.property = ctx.accounts.property.key();
        distribution.authority = ctx.accounts.authority.key();
        distribution.distribution_id = distribution_id;
        distribution.amount_per_unit_inr_minor = amount_per_unit_inr_minor;
        distribution.total_units_snapshot = ctx.accounts.property.issued_units;
        distribution.total_amount_inr_minor = total_amount;
        distribution.total_claimed_inr_minor = 0;
        distribution.status = DistributionStatus::Announced;
        distribution.created_at = now;
        distribution.payable_at = payable_at;
        distribution.bump = ctx.bumps.distribution;

        ctx.accounts.platform_config.distribution_count = distribution_id;
        Ok(())
    }

    pub fn claim_distribution(ctx: Context<ClaimDistribution>) -> Result<()> {
        require_not_paused(&ctx.accounts.platform_config)?;
        ensure_investor_active(&ctx.accounts.investor_registry)?;

        let now = Clock::get()?.unix_timestamp;
        require!(
            ctx.accounts.distribution.payable_at <= now,
            AssetError::InvalidTimestamp
        );
        require!(ctx.accounts.holding.units > 0, AssetError::NothingToClaim);

        let amount = ctx
            .accounts
            .holding
            .units
            .checked_mul(ctx.accounts.distribution.amount_per_unit_inr_minor)
            .ok_or(error!(AssetError::Overflow))?;
        require!(amount > 0, AssetError::NothingToClaim);

        let claim = &mut ctx.accounts.claim;
        claim.distribution = ctx.accounts.distribution.key();
        claim.investor = ctx.accounts.investor.key();
        claim.amount_inr_minor = amount;
        claim.claimed_at = now;
        claim.bump = ctx.bumps.claim;

        ctx.accounts.distribution.total_claimed_inr_minor = ctx
            .accounts
            .distribution
            .total_claimed_inr_minor
            .checked_add(amount)
            .ok_or(error!(AssetError::Overflow))?;
        if ctx.accounts.distribution.total_claimed_inr_minor
            >= ctx.accounts.distribution.total_amount_inr_minor
        {
            ctx.accounts.distribution.status = DistributionStatus::Paid;
        }

        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializePlatform<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        init,
        payer = authority,
        seeds = [b"platform-config"],
        bump,
        space = 8 + PlatformConfig::LEN
    )]
    pub platform_config: Account<'info, PlatformConfig>,
    pub treasury: SystemAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SetPlatformPause<'info> {
    pub authority: Signer<'info>,
    #[account(
        mut,
        seeds = [b"platform-config"],
        bump = platform_config.bump
    )]
    pub platform_config: Account<'info, PlatformConfig>,
}

#[derive(Accounts)]
pub struct RegisterIssuer<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        mut,
        seeds = [b"platform-config"],
        bump = platform_config.bump
    )]
    pub platform_config: Account<'info, PlatformConfig>,
    #[account(
        init,
        payer = authority,
        seeds = [b"issuer", authority.key().as_ref()],
        bump,
        space = 8 + IssuerProfile::LEN
    )]
    pub issuer_profile: Account<'info, IssuerProfile>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ApproveIssuer<'info> {
    pub authority: Signer<'info>,
    #[account(
        seeds = [b"platform-config"],
        bump = platform_config.bump
    )]
    pub platform_config: Account<'info, PlatformConfig>,
    #[account(
        mut,
        seeds = [b"issuer", issuer_profile.authority.as_ref()],
        bump = issuer_profile.bump
    )]
    pub issuer_profile: Account<'info, IssuerProfile>,
}

#[derive(Accounts)]
pub struct RegisterInvestor<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        mut,
        seeds = [b"platform-config"],
        bump = platform_config.bump
    )]
    pub platform_config: Account<'info, PlatformConfig>,
    #[account(
        init,
        payer = authority,
        seeds = [b"investor", authority.key().as_ref()],
        bump,
        space = 8 + InvestorRegistry::LEN
    )]
    pub investor_registry: Account<'info, InvestorRegistry>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct BindInvestorWallet<'info> {
    pub authority: Signer<'info>,
    #[account(
        seeds = [b"platform-config"],
        bump = platform_config.bump
    )]
    pub platform_config: Account<'info, PlatformConfig>,
    #[account(
        mut,
        seeds = [b"investor", authority.key().as_ref()],
        bump = investor_registry.bump
    )]
    pub investor_registry: Account<'info, InvestorRegistry>,
}

#[derive(Accounts)]
pub struct ApproveInvestor<'info> {
    pub authority: Signer<'info>,
    #[account(
        seeds = [b"platform-config"],
        bump = platform_config.bump
    )]
    pub platform_config: Account<'info, PlatformConfig>,
    #[account(
        mut,
        seeds = [b"investor", investor_registry.authority.as_ref()],
        bump = investor_registry.bump
    )]
    pub investor_registry: Account<'info, InvestorRegistry>,
}

#[derive(Accounts)]
pub struct SetInvestorFrozen<'info> {
    pub authority: Signer<'info>,
    #[account(
        seeds = [b"platform-config"],
        bump = platform_config.bump
    )]
    pub platform_config: Account<'info, PlatformConfig>,
    #[account(
        mut,
        seeds = [b"investor", investor_registry.authority.as_ref()],
        bump = investor_registry.bump
    )]
    pub investor_registry: Account<'info, InvestorRegistry>,
}

#[derive(Accounts)]
#[instruction(code: String, _asset_class: AssetClass, _asset_type: String, _symbol: String, _name: String, _city: String, _state_name: String, _structure_name: String, _target_yield_bps: u16, _target_irr_bps: u16, _expected_exit_months: u16)]
pub struct SubmitAsset<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        mut,
        seeds = [b"platform-config"],
        bump = platform_config.bump
    )]
    pub platform_config: Account<'info, PlatformConfig>,
    #[account(
        mut,
        seeds = [b"issuer", authority.key().as_ref()],
        bump = issuer_profile.bump
    )]
    pub issuer_profile: Account<'info, IssuerProfile>,
    #[account(
        init,
        payer = authority,
        seeds = [b"property", authority.key().as_ref(), code.as_bytes()],
        bump,
        space = 8 + PropertyProject::LEN
    )]
    pub property: Account<'info, PropertyProject>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CreateOffering<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        mut,
        seeds = [b"platform-config"],
        bump = platform_config.bump
    )]
    pub platform_config: Account<'info, PlatformConfig>,
    #[account(
        seeds = [b"issuer", authority.key().as_ref()],
        bump = issuer_profile.bump
    )]
    pub issuer_profile: Account<'info, IssuerProfile>,
    #[account(
        mut,
        seeds = [b"property", authority.key().as_ref(), property.code.as_bytes()],
        bump = property.bump,
        constraint = property.issuer == authority.key() @ AssetError::Unauthorized
    )]
    pub property: Account<'info, PropertyProject>,
    #[account(
        init,
        payer = authority,
        seeds = [b"offering", property.key().as_ref()],
        bump,
        space = 8 + Offering::LEN
    )]
    pub offering: Account<'info, Offering>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ApproveAsset<'info> {
    pub authority: Signer<'info>,
    #[account(
        seeds = [b"platform-config"],
        bump = platform_config.bump
    )]
    pub platform_config: Account<'info, PlatformConfig>,
    #[account(
        mut,
        seeds = [b"property", property.issuer.as_ref(), property.code.as_bytes()],
        bump = property.bump
    )]
    pub property: Account<'info, PropertyProject>,
}

#[derive(Accounts)]
pub struct PublishOffering<'info> {
    pub authority: Signer<'info>,
    #[account(
        seeds = [b"platform-config"],
        bump = platform_config.bump
    )]
    pub platform_config: Account<'info, PlatformConfig>,
    #[account(
        mut,
        seeds = [b"property", property.issuer.as_ref(), property.code.as_bytes()],
        bump = property.bump
    )]
    pub property: Account<'info, PropertyProject>,
    #[account(
        mut,
        seeds = [b"offering", property.key().as_ref()],
        bump = offering.bump,
        constraint = offering.property == property.key() @ AssetError::InvalidAssetStatus
    )]
    pub offering: Account<'info, Offering>,
}

#[derive(Accounts)]
pub struct CloseOffering<'info> {
    pub authority: Signer<'info>,
    #[account(
        seeds = [b"platform-config"],
        bump = platform_config.bump
    )]
    pub platform_config: Account<'info, PlatformConfig>,
    #[account(
        mut,
        seeds = [b"property", property.issuer.as_ref(), property.code.as_bytes()],
        bump = property.bump
    )]
    pub property: Account<'info, PropertyProject>,
    #[account(
        mut,
        seeds = [b"offering", property.key().as_ref()],
        bump = offering.bump
    )]
    pub offering: Account<'info, Offering>,
}

#[derive(Accounts)]
pub struct AllocatePrimary<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        mut,
        seeds = [b"platform-config"],
        bump = platform_config.bump
    )]
    pub platform_config: Account<'info, PlatformConfig>,
    pub investor: SystemAccount<'info>,
    #[account(
        seeds = [b"investor", investor.key().as_ref()],
        bump = investor_registry.bump
    )]
    pub investor_registry: Account<'info, InvestorRegistry>,
    #[account(
        mut,
        seeds = [b"property", property.issuer.as_ref(), property.code.as_bytes()],
        bump = property.bump
    )]
    pub property: Account<'info, PropertyProject>,
    #[account(
        mut,
        seeds = [b"offering", property.key().as_ref()],
        bump = offering.bump,
        constraint = offering.property == property.key() @ AssetError::InvalidAssetStatus
    )]
    pub offering: Account<'info, Offering>,
    #[account(
        init_if_needed,
        payer = authority,
        seeds = [b"holding", property.key().as_ref(), investor.key().as_ref()],
        bump,
        space = 8 + HoldingPosition::LEN
    )]
    pub holding: Account<'info, HoldingPosition>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(listing_id: u64, _units: u64, _price_per_unit_inr_minor: u64)]
pub struct CreateListing<'info> {
    #[account(mut)]
    pub seller: Signer<'info>,
    #[account(
        mut,
        seeds = [b"platform-config"],
        bump = platform_config.bump
    )]
    pub platform_config: Account<'info, PlatformConfig>,
    #[account(
        seeds = [b"investor", seller.key().as_ref()],
        bump = seller_registry.bump
    )]
    pub seller_registry: Account<'info, InvestorRegistry>,
    #[account(
        seeds = [b"property", property.issuer.as_ref(), property.code.as_bytes()],
        bump = property.bump
    )]
    pub property: Account<'info, PropertyProject>,
    #[account(
        seeds = [b"offering", property.key().as_ref()],
        bump = offering.bump
    )]
    pub offering: Account<'info, Offering>,
    #[account(
        mut,
        seeds = [b"holding", property.key().as_ref(), seller.key().as_ref()],
        bump = seller_holding.bump
    )]
    pub seller_holding: Account<'info, HoldingPosition>,
    #[account(
        init,
        payer = seller,
        seeds = [b"listing", property.key().as_ref(), seller.key().as_ref(), &listing_id.to_le_bytes()],
        bump,
        space = 8 + SecondaryListing::LEN
    )]
    pub listing: Account<'info, SecondaryListing>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(trade_id: u64, _units: u64)]
pub struct FillListing<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        mut,
        seeds = [b"platform-config"],
        bump = platform_config.bump
    )]
    pub platform_config: Box<Account<'info, PlatformConfig>>,
    pub buyer: SystemAccount<'info>,
    #[account(
        seeds = [b"investor", buyer.key().as_ref()],
        bump = buyer_registry.bump
    )]
    pub buyer_registry: Box<Account<'info, InvestorRegistry>>,
    pub seller: SystemAccount<'info>,
    #[account(
        seeds = [b"investor", seller.key().as_ref()],
        bump = seller_registry.bump
    )]
    pub seller_registry: Box<Account<'info, InvestorRegistry>>,
    #[account(
        seeds = [b"property", property.issuer.as_ref(), property.code.as_bytes()],
        bump = property.bump
    )]
    pub property: Box<Account<'info, PropertyProject>>,
    #[account(
        seeds = [b"offering", property.key().as_ref()],
        bump = offering.bump,
        constraint = offering.property == property.key() @ AssetError::InvalidAssetStatus
    )]
    pub offering: Box<Account<'info, Offering>>,
    #[account(
        mut,
        seeds = [b"holding", property.key().as_ref(), seller.key().as_ref()],
        bump = seller_holding.bump
    )]
    pub seller_holding: Box<Account<'info, HoldingPosition>>,
    #[account(
        init_if_needed,
        payer = authority,
        seeds = [b"holding", property.key().as_ref(), buyer.key().as_ref()],
        bump,
        space = 8 + HoldingPosition::LEN
    )]
    pub buyer_holding: Box<Account<'info, HoldingPosition>>,
    #[account(
        mut,
        seeds = [b"listing", property.key().as_ref(), seller.key().as_ref(), &listing.listing_id.to_le_bytes()],
        bump = listing.bump,
        constraint = listing.property == property.key() @ AssetError::InvalidAssetStatus,
        constraint = listing.seller == seller.key() @ AssetError::Unauthorized
    )]
    pub listing: Box<Account<'info, SecondaryListing>>,
    #[account(
        init,
        payer = authority,
        seeds = [b"trade", listing.key().as_ref(), &trade_id.to_le_bytes()],
        bump,
        space = 8 + TradeRecord::LEN
    )]
    pub trade_record: Box<Account<'info, TradeRecord>>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CancelListing<'info> {
    pub seller: Signer<'info>,
    #[account(
        seeds = [b"platform-config"],
        bump = platform_config.bump
    )]
    pub platform_config: Account<'info, PlatformConfig>,
    #[account(
        seeds = [b"property", property.issuer.as_ref(), property.code.as_bytes()],
        bump = property.bump
    )]
    pub property: Account<'info, PropertyProject>,
    #[account(
        mut,
        seeds = [b"holding", property.key().as_ref(), seller.key().as_ref()],
        bump = seller_holding.bump
    )]
    pub seller_holding: Account<'info, HoldingPosition>,
    #[account(
        mut,
        seeds = [b"listing", property.key().as_ref(), seller.key().as_ref(), &listing.listing_id.to_le_bytes()],
        bump = listing.bump,
        constraint = listing.seller == seller.key() @ AssetError::Unauthorized
    )]
    pub listing: Account<'info, SecondaryListing>,
}

#[derive(Accounts)]
#[instruction(distribution_id: u64, _amount_per_unit_inr_minor: u64, _payable_at: i64)]
pub struct CreateDistribution<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        mut,
        seeds = [b"platform-config"],
        bump = platform_config.bump
    )]
    pub platform_config: Account<'info, PlatformConfig>,
    #[account(
        seeds = [b"property", property.issuer.as_ref(), property.code.as_bytes()],
        bump = property.bump
    )]
    pub property: Account<'info, PropertyProject>,
    #[account(
        init,
        payer = authority,
        seeds = [b"distribution", property.key().as_ref(), &distribution_id.to_le_bytes()],
        bump,
        space = 8 + Distribution::LEN
    )]
    pub distribution: Account<'info, Distribution>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ClaimDistribution<'info> {
    #[account(mut)]
    pub investor: Signer<'info>,
    #[account(
        seeds = [b"platform-config"],
        bump = platform_config.bump
    )]
    pub platform_config: Account<'info, PlatformConfig>,
    #[account(
        seeds = [b"investor", investor.key().as_ref()],
        bump = investor_registry.bump
    )]
    pub investor_registry: Account<'info, InvestorRegistry>,
    #[account(
        seeds = [b"property", property.issuer.as_ref(), property.code.as_bytes()],
        bump = property.bump,
        constraint = distribution.property == property.key() @ AssetError::InvalidAssetStatus
    )]
    pub property: Account<'info, PropertyProject>,
    #[account(
        seeds = [b"holding", property.key().as_ref(), investor.key().as_ref()],
        bump = holding.bump
    )]
    pub holding: Account<'info, HoldingPosition>,
    #[account(
        mut,
        seeds = [b"distribution", property.key().as_ref(), &distribution.distribution_id.to_le_bytes()],
        bump = distribution.bump
    )]
    pub distribution: Account<'info, Distribution>,
    #[account(
        init,
        payer = investor,
        seeds = [b"claim", distribution.key().as_ref(), investor.key().as_ref()],
        bump,
        space = 8 + DistributionClaim::LEN
    )]
    pub claim: Account<'info, DistributionClaim>,
    pub system_program: Program<'info, System>,
}

fn require_not_paused(platform_config: &Account<PlatformConfig>) -> Result<()> {
    require!(!platform_config.paused, AssetError::PlatformPaused);
    Ok(())
}

fn require_authority(platform_config: &Account<PlatformConfig>, authority: &Signer) -> Result<()> {
    require_keys_eq!(
        platform_config.authority,
        authority.key(),
        AssetError::Unauthorized
    );
    Ok(())
}

fn require_settlement_authority(
    platform_config: &Account<PlatformConfig>,
    authority: &Signer,
) -> Result<()> {
    require_keys_eq!(
        platform_config.settlement_authority,
        authority.key(),
        AssetError::Unauthorized
    );
    Ok(())
}

fn validate_fee_bps(value: u16) -> Result<()> {
    require!(value <= MAX_BPS, AssetError::InvalidFeeBps);
    Ok(())
}

fn validate_code(value: &str) -> Result<()> {
    require!(
        !value.trim().is_empty() && value.len() <= PropertyProject::MAX_CODE_LEN,
        AssetError::CodeTooLong
    );
    Ok(())
}

fn validate_asset_type(value: &str) -> Result<()> {
    require!(
        !value.trim().is_empty() && value.len() <= PropertyProject::MAX_ASSET_TYPE_LEN,
        AssetError::AssetTypeTooLong
    );
    Ok(())
}

fn validate_symbol(value: &str) -> Result<()> {
    require!(
        !value.trim().is_empty() && value.len() <= PropertyProject::MAX_SYMBOL_LEN,
        AssetError::SymbolTooLong
    );
    Ok(())
}

fn validate_name(value: &str) -> Result<()> {
    require!(
        !value.trim().is_empty() && value.len() <= IssuerProfile::MAX_DISPLAY_NAME_LEN,
        AssetError::NameTooLong
    );
    Ok(())
}

fn validate_property_name(value: &str) -> Result<()> {
    require!(
        !value.trim().is_empty() && value.len() <= PropertyProject::MAX_NAME_LEN,
        AssetError::NameTooLong
    );
    Ok(())
}

fn validate_city(value: &str) -> Result<()> {
    require!(
        !value.trim().is_empty() && value.len() <= PropertyProject::MAX_CITY_LEN,
        AssetError::CityTooLong
    );
    Ok(())
}

fn validate_state(value: &str) -> Result<()> {
    require!(
        !value.trim().is_empty() && value.len() <= PropertyProject::MAX_STATE_LEN,
        AssetError::StateTooLong
    );
    Ok(())
}

fn validate_structure_name(value: &str) -> Result<()> {
    require!(
        !value.trim().is_empty() && value.len() <= PropertyProject::MAX_STRUCTURE_NAME_LEN,
        AssetError::StructureNameTooLong
    );
    Ok(())
}

fn validate_pan_last4(value: &str) -> Result<()> {
    require!(
        !value.trim().is_empty() && value.len() <= InvestorRegistry::MAX_PAN_LAST4_LEN,
        AssetError::PanTooLong
    );
    Ok(())
}

fn ensure_investor_active(registry: &Account<InvestorRegistry>) -> Result<()> {
    require!(registry.allowlisted, AssetError::InvestorNotApproved);
    require!(
        registry.kyc_status == KycStatus::Approved,
        AssetError::InvestorNotApproved
    );
    require!(!registry.frozen, AssetError::InvestorFrozen);
    Ok(())
}

fn available_holding_units(holding: &Account<HoldingPosition>) -> Result<u64> {
    holding
        .units
        .checked_sub(holding.listed_units)
        .ok_or(error!(AssetError::Overflow))
}

fn initialize_holding_if_needed(
    holding: &mut Account<HoldingPosition>,
    property: Pubkey,
    investor: Pubkey,
    bump: u8,
    now: i64,
) {
    if holding.investor == Pubkey::default() {
        holding.property = property;
        holding.investor = investor;
        holding.units = 0;
        holding.listed_units = 0;
        holding.average_price_inr_minor = 0;
        holding.invested_amount_inr_minor = 0;
        holding.created_at = now;
        holding.updated_at = now;
        holding.bump = bump;
    }
}

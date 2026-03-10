import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { AssetTokenization } from "../target/types/asset_tokenization";
import { Keypair, PublicKey, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { beforeAll, describe, expect, test } from "bun:test";

const toLeBuffer = (value: number) => Buffer.from(new anchor.BN(value).toArray("le", 8));
const enumKey = (value: Record<string, unknown>) => Object.keys(value)[0];

describe("asset-tokenization", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.AssetTokenization as Program<AssetTokenization>;
  const authority = provider.wallet;

  const issuer = Keypair.generate();
  const investorAlpha = Keypair.generate();
  const investorBeta = Keypair.generate();
  const externalWallet = Keypair.generate().publicKey;

  const propertyCode = "WHITEFIELD-COMMONS";
  const listingId = 1;
  const tradeId = 1;
  const distributionId = 1;

  let platformConfigPda: PublicKey;
  let issuerProfilePda: PublicKey;
  let investorAlphaRegistryPda: PublicKey;
  let investorBetaRegistryPda: PublicKey;
  let propertyPda: PublicKey;
  let offeringPda: PublicKey;
  let alphaHoldingPda: PublicKey;
  let betaHoldingPda: PublicKey;
  let listingPda: PublicKey;
  let tradePda: PublicKey;
  let distributionPda: PublicKey;
  let alphaClaimPda: PublicKey;
  let betaClaimPda: PublicKey;

  beforeAll(async () => {
    [platformConfigPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("platform-config")],
      program.programId,
    );
    [issuerProfilePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("issuer"), issuer.publicKey.toBuffer()],
      program.programId,
    );
    [investorAlphaRegistryPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("investor"), investorAlpha.publicKey.toBuffer()],
      program.programId,
    );
    [investorBetaRegistryPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("investor"), investorBeta.publicKey.toBuffer()],
      program.programId,
    );
    [propertyPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("property"), issuer.publicKey.toBuffer(), Buffer.from(propertyCode)],
      program.programId,
    );
    [offeringPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("offering"), propertyPda.toBuffer()],
      program.programId,
    );
    [alphaHoldingPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("holding"), propertyPda.toBuffer(), investorAlpha.publicKey.toBuffer()],
      program.programId,
    );
    [betaHoldingPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("holding"), propertyPda.toBuffer(), investorBeta.publicKey.toBuffer()],
      program.programId,
    );
    [listingPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("listing"),
        propertyPda.toBuffer(),
        investorAlpha.publicKey.toBuffer(),
        toLeBuffer(listingId),
      ],
      program.programId,
    );
    [tradePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("trade"), listingPda.toBuffer(), toLeBuffer(tradeId)],
      program.programId,
    );
    [distributionPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("distribution"), propertyPda.toBuffer(), toLeBuffer(distributionId)],
      program.programId,
    );
    [alphaClaimPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("claim"), distributionPda.toBuffer(), investorAlpha.publicKey.toBuffer()],
      program.programId,
    );
    [betaClaimPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("claim"), distributionPda.toBuffer(), investorBeta.publicKey.toBuffer()],
      program.programId,
    );

    for (const signer of [issuer, investorAlpha, investorBeta]) {
      const signature = await provider.connection.requestAirdrop(
        signer.publicKey,
        5 * LAMPORTS_PER_SOL,
      );
      await provider.connection.confirmTransaction(signature);
    }
  });

  test("initializes the platform", async () => {
    await program.methods
      .initializePlatform(100, 50)
      .accountsStrict({
        authority: authority.publicKey,
        platformConfig: platformConfigPda,
        treasury: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const config = await program.account.platformConfig.fetch(platformConfigPda);
    expect(config.authority.toBase58()).toBe(authority.publicKey.toBase58());
    expect(config.treasury.toBase58()).toBe(authority.publicKey.toBase58());
    expect(config.primaryFeeBps).toBe(100);
    expect(config.secondaryFeeBps).toBe(50);
  });

  test("registers and approves the issuer", async () => {
    await program.methods
      .registerIssuer("Eternal Issuer Labs", "Bengaluru")
      .accountsStrict({
        authority: issuer.publicKey,
        platformConfig: platformConfigPda,
        issuerProfile: issuerProfilePda,
        systemProgram: SystemProgram.programId,
      })
      .signers([issuer])
      .rpc();

    await program.methods
      .approveIssuer()
      .accountsStrict({
        authority: authority.publicKey,
        platformConfig: platformConfigPda,
        issuerProfile: issuerProfilePda,
      })
      .rpc();

    const issuerProfile = await program.account.issuerProfile.fetch(issuerProfilePda);
    expect(issuerProfile.displayName).toBe("Eternal Issuer Labs");
    expect(issuerProfile.approved).toBe(true);
  });

  test("registers investors, binds a wallet, and approves them", async () => {
    await program.methods
      .registerInvestor("Aarav Founder", "3456", investorAlpha.publicKey)
      .accountsStrict({
        authority: investorAlpha.publicKey,
        platformConfig: platformConfigPda,
        investorRegistry: investorAlphaRegistryPda,
        systemProgram: SystemProgram.programId,
      })
      .signers([investorAlpha])
      .rpc();

    await program.methods
      .registerInvestor("Diya Operator", "4567", investorBeta.publicKey)
      .accountsStrict({
        authority: investorBeta.publicKey,
        platformConfig: platformConfigPda,
        investorRegistry: investorBetaRegistryPda,
        systemProgram: SystemProgram.programId,
      })
      .signers([investorBeta])
      .rpc();

    await program.methods
      .bindInvestorWallet(externalWallet)
      .accountsStrict({
        authority: investorAlpha.publicKey,
        platformConfig: platformConfigPda,
        investorRegistry: investorAlphaRegistryPda,
      })
      .signers([investorAlpha])
      .rpc();

    for (const registry of [investorAlphaRegistryPda, investorBetaRegistryPda]) {
      await program.methods
        .approveInvestor()
        .accountsStrict({
          authority: authority.publicKey,
          platformConfig: platformConfigPda,
          investorRegistry: registry,
        })
        .rpc();
    }

    const investorAlphaRegistry =
      await program.account.investorRegistry.fetch(investorAlphaRegistryPda);
    expect(investorAlphaRegistry.wallet.toBase58()).toBe(externalWallet.toBase58());
    expect(enumKey(investorAlphaRegistry.kycStatus)).toBe("approved");
  });

  test("submits the property and offering", async () => {
    await program.methods
      .submitAsset(
        propertyCode,
        { realEstate: {} },
        "Commercial building",
        "WIC-UNIT-A",
        "Whitefield Income Commons",
        "Bengaluru",
        "Karnataka",
        "Eternal Whitefield SPV",
        850,
        1325,
        48,
      )
      .accountsStrict({
        authority: issuer.publicKey,
        platformConfig: platformConfigPda,
        issuerProfile: issuerProfilePda,
        property: propertyPda,
        systemProgram: SystemProgram.programId,
      })
      .signers([issuer])
      .rpc();

    await program.methods
      .createOffering(new anchor.BN(250_000), new anchor.BN(120_000), new anchor.BN(1_000))
      .accountsStrict({
        authority: issuer.publicKey,
        platformConfig: platformConfigPda,
        issuerProfile: issuerProfilePda,
        property: propertyPda,
        offering: offeringPda,
        systemProgram: SystemProgram.programId,
      })
      .signers([issuer])
      .rpc();

    const property = await program.account.propertyProject.fetch(propertyPda);
    const offering = await program.account.offering.fetch(offeringPda);
    expect(property.name).toBe("Whitefield Income Commons");
    expect(enumKey(property.assetClass)).toBe("realEstate");
    expect(property.assetType).toBe("Commercial building");
    expect(property.symbol).toBe("WIC-UNIT-A");
    expect(enumKey(property.status)).toBe("review");
    expect(offering.totalUnits.toNumber()).toBe(1_000);
  });

  test("approves and publishes the offering", async () => {
    await program.methods
      .approveAsset()
      .accountsStrict({
        authority: authority.publicKey,
        platformConfig: platformConfigPda,
        property: propertyPda,
      })
      .rpc();

    await program.methods
      .publishOffering()
      .accountsStrict({
        authority: authority.publicKey,
        platformConfig: platformConfigPda,
        property: propertyPda,
        offering: offeringPda,
      })
      .rpc();

    const property = await program.account.propertyProject.fetch(propertyPda);
    const offering = await program.account.offering.fetch(offeringPda);
    expect(enumKey(property.status)).toBe("live");
    expect(enumKey(offering.status)).toBe("live");
  });

  test("allocates a primary investment", async () => {
    await program.methods
      .allocatePrimary(new anchor.BN(200))
      .accountsStrict({
        authority: authority.publicKey,
        platformConfig: platformConfigPda,
        investor: investorAlpha.publicKey,
        investorRegistry: investorAlphaRegistryPda,
        property: propertyPda,
        offering: offeringPda,
        holding: alphaHoldingPda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const holding = await program.account.holdingPosition.fetch(alphaHoldingPda);
    const offering = await program.account.offering.fetch(offeringPda);
    const property = await program.account.propertyProject.fetch(propertyPda);
    expect(holding.units.toNumber()).toBe(200);
    expect(offering.remainingUnits.toNumber()).toBe(800);
    expect(property.issuedUnits.toNumber()).toBe(200);
  });

  test("creates and fills a secondary listing", async () => {
    await program.methods
      .createListing(new anchor.BN(listingId), new anchor.BN(80), new anchor.BN(125_000))
      .accountsStrict({
        seller: investorAlpha.publicKey,
        platformConfig: platformConfigPda,
        sellerRegistry: investorAlphaRegistryPda,
        property: propertyPda,
        offering: offeringPda,
        sellerHolding: alphaHoldingPda,
        listing: listingPda,
        systemProgram: SystemProgram.programId,
      })
      .signers([investorAlpha])
      .rpc();

    await program.methods
      .fillListing(new anchor.BN(tradeId), new anchor.BN(30))
      .accountsStrict({
        authority: authority.publicKey,
        platformConfig: platformConfigPda,
        buyer: investorBeta.publicKey,
        buyerRegistry: investorBetaRegistryPda,
        seller: investorAlpha.publicKey,
        sellerRegistry: investorAlphaRegistryPda,
        property: propertyPda,
        offering: offeringPda,
        sellerHolding: alphaHoldingPda,
        buyerHolding: betaHoldingPda,
        listing: listingPda,
        tradeRecord: tradePda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const listing = await program.account.secondaryListing.fetch(listingPda);
    const sellerHolding = await program.account.holdingPosition.fetch(alphaHoldingPda);
    const buyerHolding = await program.account.holdingPosition.fetch(betaHoldingPda);
    const trade = await program.account.tradeRecord.fetch(tradePda);

    expect(enumKey(listing.status)).toBe("partiallyFilled");
    expect(listing.unitsRemaining.toNumber()).toBe(50);
    expect(sellerHolding.units.toNumber()).toBe(170);
    expect(sellerHolding.listedUnits.toNumber()).toBe(50);
    expect(buyerHolding.units.toNumber()).toBe(30);
    expect(trade.grossAmountInrMinor.toNumber()).toBe(3_750_000);
  });

  test("cancels the remaining listing inventory", async () => {
    await program.methods
      .cancelListing()
      .accountsStrict({
        seller: investorAlpha.publicKey,
        platformConfig: platformConfigPda,
        property: propertyPda,
        sellerHolding: alphaHoldingPda,
        listing: listingPda,
      })
      .signers([investorAlpha])
      .rpc();

    const listing = await program.account.secondaryListing.fetch(listingPda);
    const sellerHolding = await program.account.holdingPosition.fetch(alphaHoldingPda);
    expect(enumKey(listing.status)).toBe("cancelled");
    expect(sellerHolding.listedUnits.toNumber()).toBe(0);
  });

  test("creates and claims a distribution", async () => {
    const payableAt = Math.floor(Date.now() / 1000) + 1;

    await program.methods
      .createDistribution(
        new anchor.BN(distributionId),
        new anchor.BN(2_500),
        new anchor.BN(payableAt),
      )
      .accountsStrict({
        authority: authority.publicKey,
        platformConfig: platformConfigPda,
        property: propertyPda,
        distribution: distributionPda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    await new Promise((resolve) => setTimeout(resolve, 1_500));

    await program.methods
      .claimDistribution()
      .accountsStrict({
        investor: investorAlpha.publicKey,
        platformConfig: platformConfigPda,
        investorRegistry: investorAlphaRegistryPda,
        property: propertyPda,
        holding: alphaHoldingPda,
        distribution: distributionPda,
        claim: alphaClaimPda,
        systemProgram: SystemProgram.programId,
      })
      .signers([investorAlpha])
      .rpc();

    await program.methods
      .claimDistribution()
      .accountsStrict({
        investor: investorBeta.publicKey,
        platformConfig: platformConfigPda,
        investorRegistry: investorBetaRegistryPda,
        property: propertyPda,
        holding: betaHoldingPda,
        distribution: distributionPda,
        claim: betaClaimPda,
        systemProgram: SystemProgram.programId,
      })
      .signers([investorBeta])
      .rpc();

    const alphaClaim = await program.account.distributionClaim.fetch(alphaClaimPda);
    const betaClaim = await program.account.distributionClaim.fetch(betaClaimPda);
    const distribution = await program.account.distribution.fetch(distributionPda);

    expect(alphaClaim.amountInrMinor.toNumber()).toBe(425_000);
    expect(betaClaim.amountInrMinor.toNumber()).toBe(75_000);
    expect(distribution.totalClaimedInrMinor.toNumber()).toBe(500_000);
    expect(enumKey(distribution.status)).toBe("paid");
  });

  test("blocks frozen investors from new primary allocations", async () => {
    await program.methods
      .setInvestorFrozen(true)
      .accountsStrict({
        authority: authority.publicKey,
        platformConfig: platformConfigPda,
        investorRegistry: investorBetaRegistryPda,
      })
      .rpc();

    let error: unknown = null;

    try {
      await program.methods
        .allocatePrimary(new anchor.BN(10))
        .accountsStrict({
          authority: authority.publicKey,
          platformConfig: platformConfigPda,
          investor: investorBeta.publicKey,
          investorRegistry: investorBetaRegistryPda,
          property: propertyPda,
          offering: offeringPda,
          holding: betaHoldingPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
    } catch (value) {
      error = value;
    }

    expect(error).not.toBeNull();
    expect(String(error)).toContain("InvestorFrozen");
  });
});

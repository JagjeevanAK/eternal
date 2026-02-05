import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { AssetTokenization } from "../target/types/asset_tokenization";
import { PublicKey, Keypair, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { 
  TOKEN_PROGRAM_ID, 
  getAssociatedTokenAddress,
  ASSOCIATED_TOKEN_PROGRAM_ID 
} from "@solana/spl-token";
import { expect } from "chai";
import crypto from "crypto";

describe("asset-tokenization", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.AssetTokenization as Program<AssetTokenization>;
  
  // Test accounts
  const authority = provider.wallet;
  const treasury = Keypair.generate();
  const assetOwner = Keypair.generate();
  const buyer = Keypair.generate();
  
  // PDAs
  let platformConfigPda: PublicKey;
  let assetPda: PublicKey;
  let ownershipPda: PublicKey;
  let tokenMint: Keypair;
  
  // Test data
  const assetId = "LAND-MUM-001";
  const assetType = 0; // RealEstate
  const valuation = new anchor.BN(100 * LAMPORTS_PER_SOL); // 100 SOL
  const totalFractions = new anchor.BN(1000); // 1000 fractions
  const metadataUri = "https://arweave.net/asset-metadata";
  const documentsUri = "https://arweave.net/documents";
  const location = "Mumbai, Maharashtra, India";
  const documentHash = crypto.createHash('sha256').update('title_deed_content').digest();

  before(async () => {
    // Derive PDAs
    [platformConfigPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("platform-config")],
      program.programId
    );

    [assetPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("asset"), assetOwner.publicKey.toBuffer(), Buffer.from(assetId)],
      program.programId
    );

    [ownershipPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("ownership"), assetPda.toBuffer(), buyer.publicKey.toBuffer()],
      program.programId
    );

    tokenMint = Keypair.generate();

    // Airdrop SOL to test accounts
    const airdropTx1 = await provider.connection.requestAirdrop(
      assetOwner.publicKey,
      10 * LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(airdropTx1);

    const airdropTx2 = await provider.connection.requestAirdrop(
      buyer.publicKey,
      10 * LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(airdropTx2);
  });

  it("Initializes the platform", async () => {
    const tx = await program.methods
      .initializePlatform(
        new anchor.BN(0.1 * LAMPORTS_PER_SOL), // 0.1 SOL registration fee
        100, // 1% minting fee
        50   // 0.5% trading fee
      )
      .accounts({
        authority: authority.publicKey,
        platformConfig: platformConfigPda,
        treasury: treasury.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log("Platform initialized:", tx);

    const config = await program.account.platformConfig.fetch(platformConfigPda);
    expect(config.authority.toString()).to.equal(authority.publicKey.toString());
    expect(config.treasury.toString()).to.equal(treasury.publicKey.toString());
    expect(config.registrationFee.toNumber()).to.equal(0.1 * LAMPORTS_PER_SOL);
  });

  it("Registers a new asset", async () => {
    const tx = await program.methods
      .registerAsset(
        assetId,
        assetType,
        valuation,
        totalFractions,
        metadataUri,
        documentsUri,
        location,
        Array.from(documentHash) as any
      )
      .accounts({
        owner: assetOwner.publicKey,
        platformConfig: platformConfigPda,
        asset: assetPda,
        treasury: treasury.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([assetOwner])
      .rpc();

    console.log("Asset registered:", tx);

    const asset = await program.account.asset.fetch(assetPda);
    expect(asset.owner.toString()).to.equal(assetOwner.publicKey.toString());
    expect(asset.assetId).to.equal(assetId);
    expect(asset.valuation.toNumber()).to.equal(valuation.toNumber());
    expect(asset.totalFractions.toNumber()).to.equal(totalFractions.toNumber());
    expect(asset.status).to.deep.equal({ pending: {} });
  });

  it("Verifies the asset", async () => {
    const tx = await program.methods
      .verifyAsset()
      .accounts({
        authority: authority.publicKey,
        platformConfig: platformConfigPda,
        asset: assetPda,
      })
      .rpc();

    console.log("Asset verified:", tx);

    const asset = await program.account.asset.fetch(assetPda);
    expect(asset.status).to.deep.equal({ verified: {} });
  });

  it("Tokenizes the asset", async () => {
    const metadataPda = PublicKey.findProgramAddressSync(
      [
        Buffer.from("metadata"),
        new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s").toBuffer(),
        tokenMint.publicKey.toBuffer(),
      ],
      new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s")
    )[0];

    const assetTokenAccount = await getAssociatedTokenAddress(
      tokenMint.publicKey,
      assetPda,
      true
    );

    const tx = await program.methods
      .tokenizeAsset(
        "Mumbai Land Token",
        "MLT",
        "https://arweave.net/token-metadata"
      )
      .accounts({
        owner: assetOwner.publicKey,
        platformConfig: platformConfigPda,
        asset: assetPda,
        tokenMint: tokenMint.publicKey,
        assetTokenAccount: assetTokenAccount,
        metadataAccount: metadataPda,
        tokenMetadataProgram: new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"),
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([assetOwner, tokenMint])
      .rpc();

    console.log("Asset tokenized:", tx);

    const asset = await program.account.asset.fetch(assetPda);
    expect(asset.status).to.deep.equal({ tokenized: {} });
    expect(asset.tokenMint.toString()).to.equal(tokenMint.publicKey.toString());
  });

  it("Buys fractions of the asset", async () => {
    const fractionsToBuy = new anchor.BN(10);
    
    const assetTokenAccount = await getAssociatedTokenAddress(
      tokenMint.publicKey,
      assetPda,
      true
    );

    const buyerTokenAccount = await getAssociatedTokenAddress(
      tokenMint.publicKey,
      buyer.publicKey
    );

    const tx = await program.methods
      .buyFractions(fractionsToBuy)
      .accounts({
        buyer: buyer.publicKey,
        platformConfig: platformConfigPda,
        asset: assetPda,
        assetOwner: assetOwner.publicKey,
        assetTokenAccount: assetTokenAccount,
        buyerTokenAccount: buyerTokenAccount,
        tokenMint: tokenMint.publicKey,
        ownership: ownershipPda,
        treasury: treasury.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([buyer])
      .rpc();

    console.log("Fractions purchased:", tx);

    const ownership = await program.account.ownership.fetch(ownershipPda);
    expect(ownership.fractionsOwned.toNumber()).to.equal(fractionsToBuy.toNumber());
    expect(ownership.owner.toString()).to.equal(buyer.publicKey.toString());
  });

  it("Transfers ownership fractions", async () => {
    const recipient = Keypair.generate();
    
    // Airdrop to recipient for account creation
    const airdropTx = await provider.connection.requestAirdrop(
      recipient.publicKey,
      LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(airdropTx);

    const [recipientOwnershipPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("ownership"), assetPda.toBuffer(), recipient.publicKey.toBuffer()],
      program.programId
    );

    const fromTokenAccount = await getAssociatedTokenAddress(
      tokenMint.publicKey,
      buyer.publicKey
    );

    const toTokenAccount = await getAssociatedTokenAddress(
      tokenMint.publicKey,
      recipient.publicKey
    );

    const tx = await program.methods
      .transferOwnership(new anchor.BN(5)) // Transfer 5 fractions
      .accounts({
        from: buyer.publicKey,
        to: recipient.publicKey,
        platformConfig: platformConfigPda,
        asset: assetPda,
        fromTokenAccount: fromTokenAccount,
        toTokenAccount: toTokenAccount,
        tokenMint: tokenMint.publicKey,
        fromOwnership: ownershipPda,
        toOwnership: recipientOwnershipPda,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([buyer])
      .rpc();

    console.log("Ownership transferred:", tx);

    const fromOwnership = await program.account.ownership.fetch(ownershipPda);
    const toOwnership = await program.account.ownership.fetch(recipientOwnershipPda);
    
    expect(fromOwnership.fractionsOwned.toNumber()).to.equal(5); // 10 - 5 = 5
    expect(toOwnership.fractionsOwned.toNumber()).to.equal(5);
  });

  it("Adds a document to the asset", async () => {
    const docType = "survey_report";
    const docUri = "https://arweave.net/survey-document";
    const docHash = crypto.createHash('sha256').update('survey_content').digest();

    const [documentPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("document"), assetPda.toBuffer(), Buffer.from(docType)],
      program.programId
    );

    const tx = await program.methods
      .addDocument(
        docType,
        docUri,
        Array.from(docHash) as any
      )
      .accounts({
        owner: assetOwner.publicKey,
        platformConfig: platformConfigPda,
        asset: assetPda,
        document: documentPda,
        systemProgram: SystemProgram.programId,
      })
      .signers([assetOwner])
      .rpc();

    console.log("Document added:", tx);

    const document = await program.account.document.fetch(documentPda);
    expect(document.docType).to.equal(docType);
    expect(document.uri).to.equal(docUri);
    expect(document.verified).to.equal(false);
  });

  it("Updates asset metadata", async () => {
    const newValuation = new anchor.BN(150 * LAMPORTS_PER_SOL); // Increase to 150 SOL

    const tx = await program.methods
      .updateAsset(
        newValuation,
        "https://arweave.net/updated-metadata",
        null
      )
      .accounts({
        owner: assetOwner.publicKey,
        platformConfig: platformConfigPda,
        asset: assetPda,
      })
      .signers([assetOwner])
      .rpc();

    console.log("Asset updated:", tx);

    const asset = await program.account.asset.fetch(assetPda);
    expect(asset.valuation.toNumber()).to.equal(newValuation.toNumber());
    expect(asset.metadataUri).to.equal("https://arweave.net/updated-metadata");
  });
});

import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { AssetTokenization } from "../target/types/asset_tokenization";
import {
  PublicKey,
  Keypair,
  LAMPORTS_PER_SOL,
  SystemProgram,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { describe, test, expect, beforeAll } from "bun:test";
import crypto from "crypto";

// For MPL Token Metadata Program
const TOKEN_METADATA_PROGRAM_ID = new PublicKey(
  "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s",
);

describe("asset-tokenization", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace
    .AssetTokenization as Program<AssetTokenization>;

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
  const documentHash = crypto
    .createHash("sha256")
    .update("title_deed_content")
    .digest();

  beforeAll(async () => {
    [platformConfigPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("platform-config")],
      program.programId,
    );
    [assetPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("asset"),
        assetOwner.publicKey.toBuffer(),
        Buffer.from(assetId),
      ],
      program.programId,
    );
    [ownershipPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("ownership"),
        assetPda.toBuffer(),
        buyer.publicKey.toBuffer(),
      ],
      program.programId,
    );
    tokenMint = Keypair.generate();

    const airdropTx1 = await provider.connection.requestAirdrop(
      assetOwner.publicKey,
      10 * LAMPORTS_PER_SOL,
    );
    await provider.connection.confirmTransaction(airdropTx1);
    const airdropTx2 = await provider.connection.requestAirdrop(
      buyer.publicKey,
      10 * LAMPORTS_PER_SOL,
    );
    await provider.connection.confirmTransaction(airdropTx2);
  });

  test("Initializes the platform", async () => {
    const tx = await program.methods
      .initializePlatform(new anchor.BN(0.1 * LAMPORTS_PER_SOL), 100, 50)
      .accountsStrict({
        authority: authority.publicKey,
        platformConfig: platformConfigPda,
        treasury: treasury.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log("Platform initialized:", tx);
    const config =
      await program.account.platformConfig.fetch(platformConfigPda);
    expect(config.authority.toString()).toBe(authority.publicKey.toString());
    expect(config.treasury.toString()).toBe(treasury.publicKey.toString());
  });

  test("Registers a new asset", async () => {
    const tx = await program.methods
      .registerAsset(
        assetId,
        assetType,
        valuation,
        totalFractions,
        metadataUri,
        documentsUri,
        location,
        Array.from(documentHash) as number[],
      )
      .accountsStrict({
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
    expect(asset.assetId).toBe(assetId);
  });

  test("Verifies the asset", async () => {
    const tx = await program.methods
      .verifyAsset()
      .accountsStrict({
        authority: authority.publicKey,
        platformConfig: platformConfigPda,
        asset: assetPda,
      })
      .rpc();

    console.log("Asset verified:", tx);
    const asset = await program.account.asset.fetch(assetPda);
    expect(asset.status).toEqual({ verified: {} });
  });

  test("Tokenizes the asset", async () => {
    const assetTokenAccount = await getAssociatedTokenAddress(
      tokenMint.publicKey,
      assetPda,
      true,
    );
    const [metadataAccount] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("metadata"),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        tokenMint.publicKey.toBuffer(),
      ],
      TOKEN_METADATA_PROGRAM_ID,
    );

    const tx = await program.methods
      .tokenizeAsset(
        "Mumbai Land Token",
        "MLT",
        "https://arweave.net/token-metadata",
      )
      .accountsStrict({
        owner: assetOwner.publicKey,
        platformConfig: platformConfigPda,
        asset: assetPda,
        tokenMint: tokenMint.publicKey,
        assetTokenAccount: assetTokenAccount,
        metadataAccount: metadataAccount,
        tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([assetOwner, tokenMint])
      .rpc();

    console.log("Asset tokenized:", tx);
    const asset = await program.account.asset.fetch(assetPda);
    expect(asset.status).toEqual({ tokenized: {} });
  });

  test("Buys fractions", async () => {
    const fractionsToBuy = new anchor.BN(10);
    const assetTokenAccount = await getAssociatedTokenAddress(
      tokenMint.publicKey,
      assetPda,
      true,
    );
    const buyerTokenAccount = await getAssociatedTokenAddress(
      tokenMint.publicKey,
      buyer.publicKey,
    );

    const tx = await program.methods
      .buyFractions(fractionsToBuy)
      .accountsStrict({
        buyer: buyer.publicKey,
        platformConfig: platformConfigPda,
        asset: assetPda,
        ownership: ownershipPda,
        assetOwner: assetOwner.publicKey,
        assetTokenAccount: assetTokenAccount,
        buyerTokenAccount: buyerTokenAccount,
        tokenMint: tokenMint.publicKey,
        treasury: treasury.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([buyer])
      .rpc();

    console.log("Fractions purchased:", tx);
    const ownership = await program.account.ownership.fetch(ownershipPda);
    expect(ownership.fractionsOwned.toNumber()).toBe(fractionsToBuy.toNumber());
  });

  test("Adds a document", async () => {
    const docType = "survey_report";
    const docUri = "https://arweave.net/survey-document";
    const docHash = crypto
      .createHash("sha256")
      .update("survey_content")
      .digest();
    const [documentPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("document"), assetPda.toBuffer(), Buffer.from(docType)],
      program.programId,
    );

    const tx = await program.methods
      .addDocument(docType, docUri, Array.from(docHash) as number[])
      .accountsStrict({
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
    expect(document.docType).toBe(docType);
  });

  test("Updates asset metadata", async () => {
    const newValuation = new anchor.BN(150 * LAMPORTS_PER_SOL);
    const tx = await program.methods
      .updateAsset(newValuation, "https://arweave.net/updated-metadata", null)
      .accountsStrict({
        owner: assetOwner.publicKey,
        platformConfig: platformConfigPda,
        asset: assetPda,
      })
      .signers([assetOwner])
      .rpc();

    console.log("Asset updated:", tx);
    const asset = await program.account.asset.fetch(assetPda);
    expect(asset.valuation.toNumber()).toBe(newValuation.toNumber());
  });
});

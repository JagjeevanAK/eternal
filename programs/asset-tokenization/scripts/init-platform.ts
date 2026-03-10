import { existsSync, readFileSync } from "fs";
import { homedir } from "os";
import path from "path";
import { AnchorProvider, BN, Program, Wallet } from "@coral-xyz/anchor";
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
} from "@solana/web3.js";
import idl from "../target/idl/asset_tokenization.json";
import type { AssetTokenization } from "../target/types/asset_tokenization";

const DEFAULT_WALLET_PATH = path.join(homedir(), ".config/solana/id.json");

const resolveHomePath = (input: string): string => {
  if (input.startsWith("~/")) {
    return path.join(homedir(), input.slice(2));
  }

  return input;
};

const loadKeypair = (walletPath: string): Keypair => {
  const resolvedPath = resolveHomePath(walletPath);

  if (!existsSync(resolvedPath)) {
    throw new Error(`Wallet file not found at ${resolvedPath}`);
  }

  const secret = JSON.parse(readFileSync(resolvedPath, "utf8")) as number[];
  return Keypair.fromSecretKey(Uint8Array.from(secret));
};

const walletPath = process.env.ANCHOR_WALLET ?? DEFAULT_WALLET_PATH;
const authority = loadKeypair(walletPath);
const connection = new Connection(
  process.env.ANCHOR_PROVIDER_URL ?? "https://api.devnet.solana.com",
  "confirmed",
);
const provider = new AnchorProvider(connection, new Wallet(authority), {
  commitment: "confirmed",
});
const program = new Program<AssetTokenization>(
  idl as AssetTokenization,
  provider,
);

const registrationFeeSol = Number(process.env.REGISTRATION_FEE_SOL ?? "0.1");
const mintingFeeBps = Number(process.env.MINTING_FEE_BPS ?? "100");
const tradingFeeBps = Number(process.env.TRADING_FEE_BPS ?? "50");
const treasury = new PublicKey(
  process.env.TREASURY ?? authority.publicKey.toBase58(),
);

const [platformConfig] = PublicKey.findProgramAddressSync(
  [Buffer.from("platform-config")],
  program.programId,
);

try {
  const existingConfig =
    await program.account.platformConfig.fetch(platformConfig);

  console.log("Platform already initialized.");
  console.log(`Program ID: ${program.programId.toBase58()}`);
  console.log(`Platform Config: ${platformConfig.toBase58()}`);
  console.log(
    `Authority: ${new PublicKey(existingConfig.authority).toBase58()}`,
  );
  console.log(`Treasury: ${new PublicKey(existingConfig.treasury).toBase58()}`);
  process.exit(0);
} catch {
  // Continue with initialization when the PDA is missing.
}

const signature = await program.methods
  .initializePlatform(
    new BN(Math.round(registrationFeeSol * LAMPORTS_PER_SOL)),
    mintingFeeBps,
    tradingFeeBps,
  )
  .accounts({
    authority: authority.publicKey,
    platformConfig,
    treasury,
    systemProgram: SystemProgram.programId,
  })
  .signers([authority])
  .rpc();

console.log("Platform initialized successfully.");
console.log(`Program ID: ${program.programId.toBase58()}`);
console.log(`Platform Config: ${platformConfig.toBase58()}`);
console.log(`Authority: ${authority.publicKey.toBase58()}`);
console.log(`Treasury: ${treasury.toBase58()}`);
console.log(`Transaction: ${signature}`);

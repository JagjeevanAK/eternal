import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { homedir } from "os";
import path from "path";
import { Keypair } from "@solana/web3.js";

const ROOT_DIR = path.resolve(import.meta.dir, "../../..");
const STORAGE_DIR = path.join(ROOT_DIR, ".eternal-local");
const WALLET_DIR = path.join(STORAGE_DIR, "wallets");
const DEFAULT_AUTHORITY_WALLET_PATH = path.join(homedir(), ".config/solana/id.json");

const resolveHomePath = (input: string) => {
  if (input.startsWith("~/")) {
    return path.join(homedir(), input.slice(2));
  }

  return input;
};

const ensureWalletDir = () => {
  if (!existsSync(WALLET_DIR)) {
    mkdirSync(WALLET_DIR, { recursive: true });
  }
};

const keypairPathForUser = (userId: string) => path.join(WALLET_DIR, `${userId}.json`);

const loadKeypair = (walletPath: string) => {
  const resolvedPath = resolveHomePath(walletPath);
  const secret = JSON.parse(readFileSync(resolvedPath, "utf8")) as number[];
  return Keypair.fromSecretKey(Uint8Array.from(secret));
};

const writeKeypair = (walletPath: string, keypair: Keypair) => {
  ensureWalletDir();
  writeFileSync(walletPath, JSON.stringify(Array.from(keypair.secretKey)));
};

export const getAuthorityKeypair = () => {
  const walletPath = process.env.ANCHOR_WALLET ?? DEFAULT_AUTHORITY_WALLET_PATH;
  const resolvedPath = resolveHomePath(walletPath);

  if (!existsSync(resolvedPath)) {
    throw new Error(
      `Authority wallet not found at ${resolvedPath}. Set ANCHOR_WALLET or create a Solana keypair first.`,
    );
  }

  return loadKeypair(resolvedPath);
};

export const getManagedWallet = (userId: string) => {
  const walletPath = keypairPathForUser(userId);

  if (!existsSync(walletPath)) {
    const keypair = Keypair.generate();
    writeKeypair(walletPath, keypair);
    return keypair;
  }

  return loadKeypair(walletPath);
};

export const getManagedWalletAddress = (userId: string) => getManagedWallet(userId).publicKey.toBase58();

export const getWalletStorageDir = () => {
  ensureWalletDir();
  return WALLET_DIR;
};

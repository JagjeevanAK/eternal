import { LAMPORTS_PER_SOL } from "@solana/web3.js";

const DEFAULT_SOL_PRICE_INR_MINOR = 8_190;

export const SOL_PRICE_INR_MINOR = (() => {
  const parsed = Number(process.env.NEXT_PUBLIC_SOL_PRICE_INR_MINOR ?? "");
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : DEFAULT_SOL_PRICE_INR_MINOR;
})();

export const inrMinorToLamports = (amountInrMinor: number) =>
  Math.max(0, Math.round((Math.max(0, amountInrMinor) * LAMPORTS_PER_SOL) / SOL_PRICE_INR_MINOR));

export const inrMinorToSol = (amountInrMinor: number) => inrMinorToLamports(amountInrMinor) / LAMPORTS_PER_SOL;

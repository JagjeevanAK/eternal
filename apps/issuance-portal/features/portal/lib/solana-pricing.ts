const DEFAULT_SOL_PRICE_INR_MINOR = 8_190;

export const SOL_PRICE_INR_MINOR = (() => {
  const parsed = Number(process.env.NEXT_PUBLIC_SOL_PRICE_INR_MINOR ?? "");
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : DEFAULT_SOL_PRICE_INR_MINOR;
})();

export const inrMinorToSol = (amountInrMinor: number) =>
  Math.max(0, amountInrMinor) / SOL_PRICE_INR_MINOR;

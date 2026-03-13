export const primaryInvestmentAmountInrMinor = (units: number, unitPriceInrMinor: number) =>
  Math.max(0, units) * Math.max(0, unitPriceInrMinor);

export const meetsMinimumPrimaryInvestment = (
  units: number,
  unitPriceInrMinor: number,
  minimumInvestmentInrMinor: number,
) =>
  primaryInvestmentAmountInrMinor(units, unitPriceInrMinor) >= Math.max(0, minimumInvestmentInrMinor);

export const minimumPrimaryUnits = (
  minimumInvestmentInrMinor: number,
  unitPriceInrMinor: number,
) => {
  if (unitPriceInrMinor <= 0) {
    return 0;
  }

  return Math.max(1, Math.ceil(Math.max(0, minimumInvestmentInrMinor) / unitPriceInrMinor));
};

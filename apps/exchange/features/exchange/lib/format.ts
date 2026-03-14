const PRODUCT_TIME_ZONE = "Asia/Kolkata";

export const formatInr = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);

export const formatCompactInr = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);

export const formatSol = (value: number) =>
  `${new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: value >= 10 ? 2 : 4,
  }).format(value)} SOL`;

export const formatPercent = (bps: number) => `${(bps / 100).toFixed(2)}%`;

export const formatUnits = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
  }).format(value);

export const formatDate = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat("en-IN", {
        dateStyle: "medium",
        timeZone: PRODUCT_TIME_ZONE,
      }).format(new Date(value))
    : "Not available";

export const formatDateTime = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: PRODUCT_TIME_ZONE,
      }).format(new Date(value))
    : "Not available";

export const formatRole = (value: string) =>
  value
    .split("_")
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");

export const truncateAddress = (value: string | null, visible = 4) => {
  if (!value) {
    return "Pending sync";
  }

  if (value.length <= visible * 2 + 3) {
    return value;
  }

  return `${value.slice(0, visible)}...${value.slice(-visible)}`;
};

export const minimumPrimaryUnits = (
  minimumInvestmentInrMinor: number,
  unitPriceInrMinor: number,
) => {
  if (unitPriceInrMinor <= 0) {
    return 0;
  }

  return Math.max(1, Math.ceil(Math.max(0, minimumInvestmentInrMinor) / unitPriceInrMinor));
};

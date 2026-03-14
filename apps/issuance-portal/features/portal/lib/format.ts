const PRODUCT_TIME_ZONE = "Asia/Kolkata";

export const formatFileSize = (value: number) => {
  if (value >= 1024 * 1024) {
    return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  }

  if (value >= 1024) {
    return `${Math.round(value / 1024)} KB`;
  }

  return `${value} B`;
};

export const formatInr = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);

export const formatSol = (value: number) =>
  `${new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: value >= 10 ? 2 : 4,
  }).format(value)} SOL`;

export const formatPercent = (bps: number) => `${(bps / 100).toFixed(2)}%`;

export const formatDate = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat("en-IN", {
        dateStyle: "medium",
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
    return "Pending";
  }

  if (value.length <= visible * 2 + 3) {
    return value;
  }

  return `${value.slice(0, visible)}...${value.slice(-visible)}`;
};

import { cn } from "@/lib/utils";

const toneMap: Record<string, string> = {
  approved: "border-primary/30 bg-primary/10 text-primary",
  live: "border-primary/30 bg-primary/10 text-primary",
  settled: "border-primary/30 bg-primary/10 text-primary",
  paid: "border-primary/30 bg-primary/10 text-primary",
  active: "border-primary/30 bg-primary/10 text-primary",
  pending: "border-secondary/40 bg-secondary/20 text-secondary-foreground",
  review: "border-secondary/40 bg-secondary/20 text-secondary-foreground",
  awaiting_payment: "border-secondary/40 bg-secondary/20 text-secondary-foreground",
  settlement_pending: "border-secondary/40 bg-secondary/20 text-secondary-foreground",
  not_started: "border-border bg-muted text-muted-foreground",
  rejected: "border-destructive/30 bg-destructive/10 text-destructive",
  failed: "border-destructive/30 bg-destructive/10 text-destructive",
  cancelled: "border-border bg-muted text-muted-foreground",
  filled: "border-border bg-muted text-muted-foreground",
  draft: "border-border bg-muted text-muted-foreground",
  closed: "border-border bg-muted text-muted-foreground",
  partially_filled: "border-secondary/40 bg-secondary/20 text-secondary-foreground",
};

const labelize = (value: string) =>
  value
    .split("_")
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");

export function StatusBadge({ value }: { value: string }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-2.5 py-1 text-xs font-medium",
        toneMap[value] ?? "border-border bg-muted text-muted-foreground",
      )}
    >
      {labelize(value)}
    </span>
  );
}

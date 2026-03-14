import { cn } from "@/lib/utils";

const toneMap: Record<string, string> = {
  approved: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700",
  live: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700",
  settled: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700",
  paid: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700",
  active: "border-sky-500/20 bg-sky-500/10 text-sky-700",
  pending: "border-amber-500/20 bg-amber-500/10 text-amber-700",
  review: "border-amber-500/20 bg-amber-500/10 text-amber-700",
  awaiting_payment: "border-amber-500/20 bg-amber-500/10 text-amber-700",
  settlement_pending: "border-amber-500/20 bg-amber-500/10 text-amber-700",
  partially_filled: "border-amber-500/20 bg-amber-500/10 text-amber-700",
  not_started: "border-border bg-muted text-muted-foreground",
  rejected: "border-rose-500/20 bg-rose-500/10 text-rose-700",
  failed: "border-rose-500/20 bg-rose-500/10 text-rose-700",
  cancelled: "border-border bg-muted text-muted-foreground",
  filled: "border-border bg-muted text-muted-foreground",
  draft: "border-border bg-muted text-muted-foreground",
  closed: "border-border bg-muted text-muted-foreground",
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
        "inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]",
        toneMap[value] ?? "border-border bg-muted text-muted-foreground",
      )}
    >
      {labelize(value)}
    </span>
  );
}

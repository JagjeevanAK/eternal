import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function ScreenHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-muted-foreground">
          {eyebrow}
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          {title}
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
      {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
    </div>
  );
}

export function MetricTile({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-[1.4rem] border border-white/70 bg-white/80 p-4 shadow-lg shadow-sky-950/5">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-foreground">{value}</p>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{detail}</p>
    </div>
  );
}

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-[1.4rem] border border-dashed border-border/80 bg-muted/30 px-4 py-5">
      <p className="font-medium text-foreground">{title}</p>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
    </div>
  );
}

export function Notice({
  tone,
  children,
  className,
}: {
  tone: "error" | "success" | "warning";
  children: ReactNode;
  className?: string;
}) {
  const toneClassName =
    tone === "error"
      ? "border-rose-500/20 bg-rose-500/10 text-rose-700"
      : tone === "success"
        ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700"
        : "border-amber-500/20 bg-amber-500/10 text-amber-700";

  return (
    <div className={cn("rounded-[1.4rem] border px-4 py-3 text-sm", toneClassName, className)}>
      {children}
    </div>
  );
}

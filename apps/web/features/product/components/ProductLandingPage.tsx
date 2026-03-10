"use client";

import Link from "next/link";
import { Building2, Landmark, ShieldCheck, Wallet } from "lucide-react";
import { NetworkBadge } from "@/components/layout/NetworkBadge";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { useSession } from "@/features/product/context/SessionContext";

const highlights = [
  {
    title: "Two live asset lanes",
    description: "Browse company-share issuances and real-estate offerings from the same marketplace.",
    icon: Building2,
  },
  {
    title: "Compliance-led access",
    description: "KYC, issuer review, asset approvals, and controlled secondary listings are built into the flow.",
    icon: ShieldCheck,
  },
  {
    title: "Fixed-price trading",
    description: "Primary issues and secondary listings are created at explicit INR prices instead of AMM-style pricing.",
    icon: Landmark,
  },
  {
    title: "Hybrid wallet model",
    description: "App accounts run the core experience while wallet binding stays optional for local Solana demos.",
    icon: Wallet,
  },
];

export function ProductLandingPage() {
  const { user } = useSession();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-lg font-semibold tracking-tight text-foreground">
              Eternal
            </Link>
            <NetworkBadge />
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/marketplace"
              className="rounded-xl border border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
            >
              Browse Marketplace
            </Link>
            <Link
              href={user ? "/dashboard" : "/login"}
              className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              {user ? "Open Workspace" : "Sign In"}
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-16">
        <section className="grid gap-10 lg:grid-cols-[1.2fr,0.8fr] lg:items-start">
          <div className="space-y-8">
            <div className="inline-flex rounded-full border border-border bg-card px-4 py-2 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
              Local-first India product stack
            </div>
            <div className="space-y-4">
              <h1 className="max-w-4xl text-5xl font-semibold tracking-tight text-foreground md:text-6xl">
                Tokenized company and real-estate issues with fixed-price trading on localhost.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
                Eternal now runs as a local asset marketplace where issuers can publish company-share or real-estate
                offerings, investors can browse and buy them, and holders can resell positions through fixed-price
                listings.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/marketplace"
                className="rounded-2xl bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
              >
                Explore live assets
              </Link>
              <Link
                href="/login"
                className="rounded-2xl border border-border px-5 py-3 text-sm font-medium text-foreground transition-colors hover:bg-card"
              >
                Use seeded local accounts
              </Link>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-3xl border border-border bg-card p-5">
                <p className="text-sm text-muted-foreground">Investor flow</p>
                <p className="mt-2 text-xl font-semibold text-foreground">Browse / Buy / Pay / Settle</p>
              </div>
              <div className="rounded-3xl border border-border bg-card p-5">
                <p className="text-sm text-muted-foreground">Issuer flow</p>
                <p className="mt-2 text-xl font-semibold text-foreground">Issue / Review / Approve / Publish</p>
              </div>
              <div className="rounded-3xl border border-border bg-card p-5">
                <p className="text-sm text-muted-foreground">Market flow</p>
                <p className="mt-2 text-xl font-semibold text-foreground">List / Buy / Trade at fixed price</p>
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] border border-border bg-card p-6">
            <p className="text-sm font-medium text-muted-foreground">What is already local</p>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-foreground">
              <li>Seeded admin, issuer, approved investor, and pending-KYC investor accounts.</li>
              <li>Mock OTP sign-in using `000000`.</li>
              <li>Mock INR balances and payment settlement through the worker.</li>
              <li>Live company-share and real-estate inventory plus issuer/admin review queues.</li>
              <li>Optional Solana wallet binding without forcing wallet-first onboarding.</li>
            </ul>
          </div>
        </section>

        <section className="mt-14 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {highlights.map(({ title, description, icon: Icon }) => (
            <div key={title} className="rounded-3xl border border-border bg-card p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <h2 className="mt-4 text-lg font-semibold text-foreground">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}

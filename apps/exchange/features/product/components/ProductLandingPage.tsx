"use client";

import Link from "next/link";
import { Building2, Landmark, ShieldCheck, Wallet } from "lucide-react";
import { NetworkBadge } from "@/components/layout/NetworkBadge";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { useSession } from "@/features/product/context/SessionContext";

const highlights = [
  {
    title: "Approved inventory only",
    description: "Browse the assets that have already cleared review and are ready for exchange-side discovery.",
    icon: Building2,
  },
  {
    title: "Issuance kept separate",
    description: "New submissions now live in the issuer portal, while review and publishing move through the admin app.",
    icon: ShieldCheck,
  },
  {
    title: "Fixed-price trading",
    description: "Primary subscriptions and secondary listings still run at explicit INR prices instead of AMM-style pricing.",
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
            {user ? (
              <Link
                href="/dashboard"
                className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
              >
                Open Workspace
              </Link>
            ) : (
              <>
                <Link
                  href="/login#signup"
                  className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-card"
                >
                  Sign Up
                </Link>
                <Link
                  href="/login"
                  className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
                >
                  Sign In
                </Link>
              </>
            )}
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
                Browse approved tokenized assets and trade them through a local fixed-price exchange.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
                Eternal Exchange now focuses on what happens after approval: discovery, subscriptions, payments,
                holdings, and secondary listings. Issuer submission and admin review workflows now live in dedicated
                issuer and admin apps.
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
                href="/login#signup"
                className="rounded-2xl border border-border px-5 py-3 text-sm font-medium text-foreground transition-colors hover:bg-card"
              >
                Create account
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
                <p className="text-sm text-muted-foreground">Discovery flow</p>
                <p className="mt-2 text-xl font-semibold text-foreground">Browse / Review / Subscribe</p>
              </div>
              <div className="rounded-3xl border border-border bg-card p-5">
                <p className="text-sm text-muted-foreground">Exchange flow</p>
                <p className="mt-2 text-xl font-semibold text-foreground">Order / Pay / Settle</p>
              </div>
              <div className="rounded-3xl border border-border bg-card p-5">
                <p className="text-sm text-muted-foreground">Portfolio flow</p>
                <p className="mt-2 text-xl font-semibold text-foreground">Hold / List / Trade at fixed price</p>
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] border border-border bg-card p-6">
            <p className="text-sm font-medium text-muted-foreground">What is already local</p>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-foreground">
              <li>Seeded investor accounts for exchange sign-in, plus separate issuer and admin portals.</li>
              <li>Mock OTP sign-in using `000000`.</li>
              <li>Optional investor signup with a real email and Resend-delivered OTP.</li>
              <li>Mock INR balances and payment settlement through the worker.</li>
              <li>Live company-share and real-estate inventory that was already approved upstream.</li>
              <li>Issuer submission, owner verification, and admin review now live outside the exchange UI.</li>
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

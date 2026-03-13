import Link from "next/link";
import { ArrowRight, Building2, FileCheck2, Shield } from "lucide-react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

const lanes = [
  {
    title: "Owner verification",
    description: "Collect ownership documents, route them to the right issuer, and track every decision in one place.",
    href: "/verification",
    icon: FileCheck2,
  },
  {
    title: "Issuer desk",
    description: "Create new company-share and real-estate issues, then keep an eye on every draft and review state.",
    href: "/issuer",
    icon: Building2,
  },
  {
    title: "Admin review",
    description: "Approve KYC records, clear new submissions, and push reviewed assets toward live distribution.",
    href: "/admin",
    icon: Shield,
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-hidden bg-background text-foreground">
      <div className="absolute inset-x-0 top-0 -z-10 h-[34rem] bg-[radial-gradient(circle_at_top_left,rgba(214,158,46,0.18),transparent_42%),radial-gradient(circle_at_top_right,rgba(16,185,129,0.16),transparent_38%),linear-gradient(180deg,rgba(15,23,42,0.03),transparent_56%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(214,158,46,0.18),transparent_34%),radial-gradient(circle_at_top_right,rgba(56,189,248,0.12),transparent_30%),linear-gradient(180deg,rgba(15,23,42,0.72),rgba(15,23,42,0))]" />

      <section className="mx-auto max-w-6xl px-6 py-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.28em] text-muted-foreground">Eternal</p>
            <h1 className="mt-2 text-xl font-semibold">Issuance Portal</h1>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/signup"
              className="rounded-full border border-border bg-card/80 px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-card"
            >
              Sign Up
            </Link>
            <Link
              href="/login"
              className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              Sign In
            </Link>
            <ThemeToggle />
          </div>
        </header>

        <div className="mt-16 grid gap-10 lg:grid-cols-[1.1fr,0.9fr] lg:items-start">
          <section>
            <div className="inline-flex rounded-full border border-border bg-card/80 px-4 py-2 text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground backdrop-blur">
              Submission, verification, approval
            </div>
            <h2 className="mt-8 max-w-4xl text-5xl font-semibold tracking-tight md:text-6xl">
              A dedicated control room for everything that happens before an asset reaches exchange.
            </h2>
            <p className="mt-6 max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
              Separate the issuance workflow from the trading surface. Owners can upload proof, issuers can package
              new offerings, and admins can review compliance without cluttering the exchange app.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
              >
                Open portal
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/signup"
                className="rounded-2xl border border-border bg-card/80 px-5 py-3 text-sm font-medium text-foreground transition-colors hover:bg-card"
              >
                Create portal account
              </Link>
            </div>
          </section>

          <section className="rounded-[2rem] border border-border bg-card/85 p-6 shadow-sm backdrop-blur">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">Portal lanes</p>
            <div className="mt-6 space-y-4">
              {lanes.map(({ title, description, href, icon: Icon }) => (
                <Link
                  key={title}
                  href={href}
                  className="group block rounded-[1.5rem] border border-border bg-background/90 p-5 transition-colors hover:border-primary/30 hover:bg-background"
                >
                  <div className="flex items-start gap-4">
                    <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center justify-between gap-4">
                        <h3 className="text-lg font-semibold">{title}</h3>
                        <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                      </div>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}

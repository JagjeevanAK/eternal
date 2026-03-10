const steps = [
  "Connect your Solana wallet",
  "Register your real-world asset",
  "Upload supporting records and metadata",
  "Get the asset verified by the platform authority",
  "Tokenize ownership into tradable fractions",
  "List the asset and trade fractions on the marketplace",
];

const CheckIcon = () => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="mt-1 h-4 w-4 shrink-0 text-primary"
    >
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <path
        d="M12 2c-.218 0 -.432 .002 -.642 .005l-.616 .017l-.299 .013l-.579 .034l-.553 .046c-4.785 .464 -6.732 2.411 -7.196 7.196l-.046 .553l-.034 .579c-.005 .098 -.01 .198 -.013 .299l-.017 .616l-.004 .318l-.001 .324c0 .218 .002 .432 .005 .642l.017 .616l.013 .299l.034 .579l.046 .553c.464 4.785 2.411 6.732 7.196 7.196l.553 .046l.579 .034c.098 .005 .198 .01 .299 .013l.616 .017l.642 .005l.642 -.005l.616 -.017l.299 -.013l.579 -.034l.553 -.046c4.785 -.464 6.732 -2.411 7.196 -7.196l.046 -.553l.034 -.579c.005 -.098 .01 -.198 .013 -.299l.017 -.616l.005 -.642l-.005 -.642l-.017 -.616l-.013 -.299l-.034 -.579l-.046 -.553c-.464 -4.785 -2.411 -6.732 -7.196 -7.196l-.553 -.046l-.579 -.034a28.058 28.058 0 0 0 -.299 -.013l-.616 -.017l-.318 -.004l-.324 -.001zm2.293 7.293a1 1 0 0 1 1.497 1.32l-.083 .094l-4 4a1 1 0 0 1 -1.32 .083l-.094 -.083l-2 -2a1 1 0 0 1 1.32 -1.497l.094 .083l1.293 1.292l3.293 -3.292z"
        fill="currentColor"
        strokeWidth="0"
      />
    </svg>
  );
};

export const HowItWorks = () => {
  return (
    <section className="mt-24 flex justify-center">
      <div className="relative max-w-4xl overflow-hidden rounded-4xl border border-border bg-card/50 p-8 text-left backdrop-blur-sm md:p-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,var(--primary)/0.18,transparent_38%),radial-gradient(circle_at_bottom_right,var(--ring)/0.14,transparent_30%)]" />
        <div className="relative grid gap-10 md:grid-cols-[0.9fr,1.1fr]">
          <div className="space-y-4">
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-primary/80">
              Asset Flow
            </p>
            <h2 className="text-3xl font-semibold tracking-tight text-foreground">
              From registration to secondary trading.
            </h2>
            <p className="max-w-md text-sm leading-7 text-muted-foreground">
              Eternal keeps the lifecycle explicit: issuer onboarding, document-backed
              verification, tokenization, then marketplace liquidity on Solana with either
              a devnet or localnet demo flow.
            </p>
            <div className="rounded-2xl border border-border bg-background/30 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                Supported Assets
              </p>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                Real estate, gold, vehicles, art, infrastructure, and other
                high-value assets that benefit from shared ownership and transparent transfer.
              </p>
            </div>
          </div>

          <ol className="space-y-3">
            {steps.map((step, index) => (
              <li
                key={step}
                className="flex items-start gap-4 rounded-2xl border border-border bg-background/40 px-4 py-4"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-sm font-semibold text-primary">
                  {index + 1}
                </div>
                <div className="flex min-w-0 gap-3">
                  <CheckIcon />
                  <p className="pt-0.5 text-sm leading-6 text-foreground">{step}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
};

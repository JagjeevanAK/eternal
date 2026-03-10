import { cn } from "@/lib/utils";
import { ArrowRightIcon } from "lucide-react";
import AnimatedShinyText from "@/components/ui/animated-shiny-text";
import dynamic from 'next/dynamic';
import Link from 'next/link';

const WalletMultiButton = dynamic(
  () => import('@solana/wallet-adapter-react-ui').then((mod) => mod.WalletMultiButton),
  { ssr: false }
);

export const Hero = () => {
  return (
    <div className="space-y-6 pt-20">
      <div className="flex flex-col items-center gap-2">
        <div className={cn(
          "group rounded-full border border-border bg-card text-sm text-muted-foreground transition-all ease-in hover:border-ring/40"
        )}>
          <AnimatedShinyText className="inline-flex items-center justify-center px-3 py-0.5 transition ease-out">
            <span>Asset Tokenization on Solana</span>
            <ArrowRightIcon className="ml-1 size-2.5 transition-transform duration-300 ease-in-out group-hover:translate-x-0.5" />
          </AnimatedShinyText>
        </div>
        <h1 className="text-6xl font-bold text-foreground tracking-tight md:text-7xl">
          Eternal
        </h1>
      </div>
      <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
        Bring real-world assets on-chain with verifiable records,
        <br />
        fractional ownership, and a live secondary market.
      </p>
      <div className="flex items-center justify-center gap-4">
        <WalletMultiButton className="bg-primary! text-primary-foreground! hover:opacity-90! px-8! py-4! rounded-lg! font-medium! text-base! transition-colors" />
        <Link
          href="/marketplace"
          className="px-8 py-4 rounded-lg font-medium text-base border border-border text-foreground hover:bg-accent transition-colors"
        >
          Browse Marketplace
        </Link>
      </div>
    </div>
  );
};

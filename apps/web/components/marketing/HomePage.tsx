'use client';

import React from 'react';
import Link from 'next/link';
import Particles from "@/components/ui/particles";
import FeatureGrid from '@/components/marketing/FeatureGrid';
import { Hero } from '@/components/marketing/Hero';
import { HowItWorks } from '@/components/marketing/HowItWorks';
import { FAQ } from '@/components/marketing/FAQ';
import { NetworkBadge } from '@/components/layout/NetworkBadge';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { useTheme } from 'next-themes';

const structuredData = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "Eternal",
  "applicationCategory": "DeFi",
  "operatingSystem": "Web",
  "description": "Tokenize real-world assets on Solana. Fractional ownership of real estate, gold, art, and more with instant settlement.",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD"
  }
};

const HomePage = () => {
  const { resolvedTheme } = useTheme();
  const particleColor = resolvedTheme === 'dark' ? '#ffffff' : '#1a1a1a';

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <div className="min-h-screen bg-background text-foreground overflow-hidden">
        <div className="relative min-h-screen flex flex-col">
          <Particles
            className="absolute inset-0"
            quantity={300}
            staticity={30}
            ease={50}
            color={particleColor}
          />
          <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col p-8">
            <header className="flex items-center justify-between border-b border-border pb-6">
              <div className="flex items-center gap-3">
                <Link href="/" className="text-lg font-semibold tracking-tight text-foreground">
                  Eternal
                </Link>
                <NetworkBadge />
              </div>
              <nav className="flex items-center gap-2">
                <Link
                  href="/marketplace"
                  className="rounded-lg px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  Marketplace
                </Link>
                <Link
                  href="/register"
                  className="rounded-lg px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  Register
                </Link>
                <ThemeToggle />
              </nav>
            </header>

            <div className="space-y-16 py-8 text-center">
            <Hero />
            <FeatureGrid />
            <HowItWorks />
            <FAQ />

            <div className="pt-16 border-t border-border">
              <p className="text-sm text-muted-foreground">
                Built for registering, verifying, tokenizing, and trading real-world assets on Solana.
              </p>
            </div>
          </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default HomePage;

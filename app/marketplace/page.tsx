'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import '@solana/wallet-adapter-react-ui/styles.css';
import { NetworkConfigurationProvider } from '@/contexts/NetworkConfigurationProvider';

const WalletConnectionProvider = dynamic(
  () => import('@/components/WalletConnectionProvider'),
  { ssr: false }
);

const MarketplaceContent = dynamic(
  () => import('@/components/marketplace/MarketplacePage').then((mod) => ({ default: mod.MarketplacePage })),
  { ssr: false }
);

const WalletMultiButton = dynamic(
  () => import('@solana/wallet-adapter-react-ui').then((mod) => mod.WalletMultiButton),
  { ssr: false }
);

import { NetworkSwitcher } from '@/components/NetworkSwitcher';
import Link from 'next/link';

export default function MarketplacePage() {
  return (
    <NetworkConfigurationProvider>
      <WalletConnectionProvider>
        <div className="min-h-screen bg-black text-white">
          <nav className="bg-zinc-900/50 backdrop-blur-sm sticky top-0 z-50 border-b border-zinc-800">
            <div className="max-w-6xl mx-auto flex justify-between items-center px-6 py-4">
              <div className="flex items-center space-x-4">
                <Link href="/" className="text-xl font-medium text-white hover:text-zinc-300 transition-colors">
                  Eternal Key
                </Link>
                <span className="px-2.5 py-0.5 rounded-full text-xs bg-green-900/50 text-green-400 border border-green-800">
                  Marketplace
                </span>
                <NetworkSwitcher />
              </div>
              <div className="flex items-center space-x-3">
                <Link href="/register" className="px-4 py-2 text-sm text-zinc-300 hover:text-white transition-colors">
                  Register Asset
                </Link>
                <Link href="/portfolio" className="px-4 py-2 text-sm text-zinc-300 hover:text-white transition-colors">
                  Portfolio
                </Link>
                <Link href="/admin" className="px-4 py-2 text-sm text-zinc-300 hover:text-white transition-colors">
                  Admin
                </Link>
                <WalletMultiButton className="!bg-white !text-black hover:!bg-zinc-200 !rounded-lg !text-sm transition-colors" />
              </div>
            </div>
          </nav>

          <main className="max-w-6xl mx-auto p-6">
            <MarketplaceContent />
          </main>
        </div>
      </WalletConnectionProvider>
    </NetworkConfigurationProvider>
  );
}

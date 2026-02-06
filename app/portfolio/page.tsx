'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import '@solana/wallet-adapter-react-ui/styles.css';
import { NetworkConfigurationProvider } from '@/contexts/NetworkConfigurationProvider';
import Link from 'next/link';
import { IconBriefcase, IconLoader2 } from '@tabler/icons-react';
import { BN } from '@coral-xyz/anchor';

const WalletConnectionProvider = dynamic(
  () => import('@/components/WalletConnectionProvider'),
  { ssr: false }
);

const WalletMultiButton = dynamic(
  () => import('@solana/wallet-adapter-react-ui').then((mod) => mod.WalletMultiButton),
  { ssr: false }
);

import { NetworkSwitcher } from '@/components/NetworkSwitcher';

const PortfolioContent = dynamic(() => import('./PortfolioContent'), { ssr: false });

export default function PortfolioPage() {
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
                <span className="px-2.5 py-0.5 rounded-full text-xs bg-purple-900/50 text-purple-400 border border-purple-800">
                  Portfolio
                </span>
                <NetworkSwitcher />
              </div>
              <div className="flex items-center space-x-3">
                <Link href="/marketplace" className="px-4 py-2 text-sm text-zinc-300 hover:text-white transition-colors">
                  Marketplace
                </Link>
                <Link href="/register" className="px-4 py-2 text-sm text-zinc-300 hover:text-white transition-colors">
                  Register
                </Link>
                <WalletMultiButton className="!bg-white !text-black hover:!bg-zinc-200 !rounded-lg !text-sm transition-colors" />
              </div>
            </div>
          </nav>

          <main className="max-w-6xl mx-auto p-6">
            <PortfolioContent />
          </main>
        </div>
      </WalletConnectionProvider>
    </NetworkConfigurationProvider>
  );
}

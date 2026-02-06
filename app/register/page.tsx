'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import '@solana/wallet-adapter-react-ui/styles.css';
import { NetworkConfigurationProvider } from '@/contexts/NetworkConfigurationProvider';

const WalletConnectionProvider = dynamic(
  () => import('@/components/WalletConnectionProvider'),
  { ssr: false }
);

const RegisterAssetFormDynamic = dynamic(
  () => import('@/components/asset-tokenization/RegisterAssetForm').then((mod) => ({ default: mod.RegisterAssetForm })),
  { ssr: false }
);

const WalletMultiButton = dynamic(
  () => import('@solana/wallet-adapter-react-ui').then((mod) => mod.WalletMultiButton),
  { ssr: false }
);

import { NetworkSwitcher } from '@/components/NetworkSwitcher';
import Link from 'next/link';
import { IconPlus } from '@tabler/icons-react';

export default function RegisterPage() {
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
                <span className="px-2.5 py-0.5 rounded-full text-xs bg-blue-900/50 text-blue-400 border border-blue-800">
                  Register
                </span>
                <NetworkSwitcher />
              </div>
              <div className="flex items-center space-x-3">
                <Link href="/marketplace" className="px-4 py-2 text-sm text-zinc-300 hover:text-white transition-colors">
                  Marketplace
                </Link>
                <Link href="/portfolio" className="px-4 py-2 text-sm text-zinc-300 hover:text-white transition-colors">
                  Portfolio
                </Link>
                <WalletMultiButton className="!bg-white !text-black hover:!bg-zinc-200 !rounded-lg !text-sm transition-colors" />
              </div>
            </div>
          </nav>

          <main className="max-w-3xl mx-auto p-6">
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                <IconPlus className="w-7 h-7 text-blue-400" />
                Register New Asset
              </h1>
              <p className="text-sm text-zinc-400 mt-1">
                Register a real-world asset on the blockchain for tokenization
              </p>
            </div>

            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
              <RegisterAssetFormDynamic
                onSuccess={() => {
                  // Optionally redirect to marketplace
                }}
              />
            </div>
          </main>
        </div>
      </WalletConnectionProvider>
    </NetworkConfigurationProvider>
  );
}

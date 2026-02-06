'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import '@solana/wallet-adapter-react-ui/styles.css';
import { NetworkConfigurationProvider } from '@/contexts/NetworkConfigurationProvider';
import { PublicKey } from '@solana/web3.js';

const WalletConnectionProvider = dynamic(
  () => import('@/components/WalletConnectionProvider'),
  { ssr: false }
);

const WalletMultiButton = dynamic(
  () => import('@solana/wallet-adapter-react-ui').then((mod) => mod.WalletMultiButton),
  { ssr: false }
);

const AssetDetailView = dynamic(
  () => import('./AssetDetailView').then((mod) => ({ default: mod.AssetDetailView })),
  { ssr: false }
);

import { NetworkSwitcher } from '@/components/NetworkSwitcher';
import Link from 'next/link';

export default function AssetDetailPage() {
  const params = useParams();
  const id = params.id as string;

  // Validate the id is a valid base58 pubkey
  let assetPubkey: PublicKey | null = null;
  try {
    assetPubkey = new PublicKey(id);
  } catch {
    // invalid pubkey
  }

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
                  Asset Details
                </span>
                <NetworkSwitcher />
              </div>
              <div className="flex items-center space-x-3">
                <Link href="/marketplace" className="px-4 py-2 text-sm text-zinc-300 hover:text-white transition-colors">
                  Marketplace
                </Link>
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
            {assetPubkey ? (
              <AssetDetailView assetPubkey={assetPubkey} />
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
                <p className="text-lg font-medium text-white">Invalid Asset ID</p>
                <p className="text-sm mt-1">The asset address provided is not valid.</p>
                <Link
                  href="/marketplace"
                  className="mt-4 px-4 py-2 bg-zinc-800 text-white rounded-lg text-sm hover:bg-zinc-700 transition-colors"
                >
                  Back to Marketplace
                </Link>
              </div>
            )}
          </main>
        </div>
      </WalletConnectionProvider>
    </NetworkConfigurationProvider>
  );
}

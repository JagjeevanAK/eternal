'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { PublicKey } from '@solana/web3.js';
import { AssetDetailView } from '@/features/assets/components/AssetDetailView';

export default function AssetDetailPage() {
  const params = useParams();
  const id = params.id as string;

  let assetPubkey: PublicKey | null = null;
  try {
    assetPubkey = new PublicKey(id);
  } catch {
    assetPubkey = null;
  }

  if (!assetPubkey) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
        <p className="text-lg font-medium text-white">Invalid Asset ID</p>
        <p className="mt-1 text-sm">The asset address provided is not valid.</p>
        <Link
          href="/marketplace"
          className="mt-4 rounded-lg bg-zinc-800 px-4 py-2 text-sm text-white transition-colors hover:bg-zinc-700"
        >
          Back to Marketplace
        </Link>
      </div>
    );
  }

  return <AssetDetailView assetPubkey={assetPubkey} />;
}

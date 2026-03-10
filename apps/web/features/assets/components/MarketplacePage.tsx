'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAssets, AssetAccount } from '@/features/assets/hooks/useAssets';
import { AssetGrid } from '@/features/assets/components/AssetGrid';
import { BuyFractionsModal } from '@/features/assets/components/BuyFractionsModal';
import { IconBuildingStore } from '@tabler/icons-react';

export const MarketplacePage: React.FC = () => {
  const router = useRouter();
  const { assets, loading, error, refetch } = useAssets();
  const [buyModalAsset, setBuyModalAsset] = useState<AssetAccount | null>(null);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <IconBuildingStore className="w-7 h-7 text-green-400" />
          Marketplace
        </h1>
        <p className="text-sm text-zinc-400 mt-1">
          Browse and invest in tokenized real-world assets
        </p>
      </div>

      {/* Asset Grid */}
      <AssetGrid
        assets={assets}
        loading={loading}
        error={error}
        onBuy={(asset) => setBuyModalAsset(asset)}
        onDetails={(asset) => router.push(`/asset/${asset.publicKey.toBase58()}`)}
        showFilters={true}
      />

      {/* Buy Modal */}
      {buyModalAsset && (
        <BuyFractionsModal
          asset={buyModalAsset.account}
          assetPubkey={buyModalAsset.publicKey}
          isOpen={!!buyModalAsset}
          onClose={() => setBuyModalAsset(null)}
          onSuccess={refetch}
        />
      )}
    </div>
  );
};

'use client';

import React, { useState } from 'react';
import { useAssets, AssetAccount } from '../asset-tokenization/hooks/useAssets';
import { AssetGrid } from '../asset-tokenization/AssetGrid';
import { BuyFractionsModal } from '../asset-tokenization/BuyFractionsModal';
import { IconStore } from '@tabler/icons-react';

interface MarketplacePageProps {
  onAssetDetails?: (asset: AssetAccount) => void;
}

export const MarketplacePage: React.FC<MarketplacePageProps> = ({ onAssetDetails }) => {
  const { assets, loading, error, refetch } = useAssets();
  const [buyModalAsset, setBuyModalAsset] = useState<AssetAccount | null>(null);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <IconStore className="w-7 h-7 text-green-400" />
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
        onDetails={onAssetDetails}
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

'use client';

import React, { useMemo, useState } from 'react';
import { AssetCard } from './AssetCard';
import { AssetFilters, AssetFilterValues, defaultFilters } from './AssetFilters';
import { AssetAccount } from './hooks/useAssets';
import { parseAssetStatus, parseAssetType } from '@/types/asset-tokenization';
import { IconLoader2, IconMoodEmpty } from '@tabler/icons-react';

interface AssetGridProps {
  assets: AssetAccount[];
  loading: boolean;
  error: string | null;
  onBuy?: (asset: AssetAccount) => void;
  onDetails?: (asset: AssetAccount) => void;
  showFilters?: boolean;
}



export const AssetGrid: React.FC<AssetGridProps> = ({
  assets,
  loading,
  error,
  onBuy,
  onDetails,
  showFilters = true,
}) => {
  const [filters, setFilters] = useState<AssetFilterValues>(defaultFilters);

  const filteredAssets = useMemo(() => {
    let result = [...assets];

    // Filter by type
    if (filters.assetType !== null) {
      result = result.filter((a) => parseAssetType(a.account.assetType) === filters.assetType);
    }

    // Filter by status
    if (filters.status !== null) {
      result = result.filter((a) => parseAssetStatus(a.account.status) === filters.status);
    }

    // Search
    if (filters.searchQuery) {
      const q = filters.searchQuery.toLowerCase();
      result = result.filter(
        (a) =>
          a.account.assetId.toLowerCase().includes(q) ||
          a.account.location.toLowerCase().includes(q)
      );
    }

    // Sort
    switch (filters.sortBy) {
      case 'newest':
        result.sort((a, b) => b.account.createdAt.sub(a.account.createdAt).toNumber());
        break;
      case 'oldest':
        result.sort((a, b) => a.account.createdAt.sub(b.account.createdAt).toNumber());
        break;
      case 'valuation-high':
        result.sort((a, b) => b.account.valuation.sub(a.account.valuation).toNumber());
        break;
      case 'valuation-low':
        result.sort((a, b) => a.account.valuation.sub(b.account.valuation).toNumber());
        break;
      case 'most-sold':
        result.sort((a, b) => {
          const aSold = a.account.totalFractions.sub(a.account.availableFractions);
          const bSold = b.account.totalFractions.sub(b.account.availableFractions);
          return bSold.sub(aSold).toNumber();
        });
        break;
    }

    return result;
  }, [assets, filters]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
        <IconLoader2 className="w-8 h-8 animate-spin mb-4" />
        <p className="text-sm">Loading assets...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-red-400">
        <p className="text-sm">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {showFilters && <AssetFilters filters={filters} onChange={setFilters} />}

      {filteredAssets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
          <IconMoodEmpty className="w-12 h-12 mb-4" />
          <p className="text-lg font-medium">No assets found</p>
          <p className="text-sm mt-1">
            {assets.length > 0
              ? 'Try adjusting your filters'
              : 'No assets have been registered yet'}
          </p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-zinc-500">
              {filteredAssets.length} asset{filteredAssets.length !== 1 ? 's' : ''} found
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAssets.map((asset) => (
              <AssetCard
                key={asset.publicKey.toBase58()}
                asset={asset.account}
                onBuy={() => onBuy?.(asset)}
                onDetails={() => onDetails?.(asset)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

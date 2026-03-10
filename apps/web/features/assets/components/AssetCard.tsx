'use client';

import React from 'react';
import { BN } from '@coral-xyz/anchor';
import { Asset, AssetStatus, AssetType, getAssetTypeName, getAssetStatusName, parseAssetStatus, parseAssetType } from '@/features/assets/types';
import { cn } from '@/lib/utils';
import {
  IconBuilding,
  IconCoin,
  IconBuildingBridge2,
  IconCar,
  IconPalette,
  IconPackage,
  IconDots,
  IconMapPin,
  IconChartPie,
} from '@tabler/icons-react';

interface AssetCardProps {
  asset: Asset;
  onBuy?: () => void;
  onDetails?: () => void;
}

const assetTypeIcons: Record<number, React.ReactNode> = {
  [AssetType.RealEstate]: <IconBuilding className="w-5 h-5" />,
  [AssetType.Gold]: <IconCoin className="w-5 h-5" />,
  [AssetType.Infrastructure]: <IconBuildingBridge2 className="w-5 h-5" />,
  [AssetType.Vehicle]: <IconCar className="w-5 h-5" />,
  [AssetType.Art]: <IconPalette className="w-5 h-5" />,
  [AssetType.Commodity]: <IconPackage className="w-5 h-5" />,
  [AssetType.Other]: <IconDots className="w-5 h-5" />,
};

const statusColors: Record<number, string> = {
  [AssetStatus.Pending]: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  [AssetStatus.Verified]: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  [AssetStatus.Tokenized]: 'bg-green-500/10 text-green-400 border-green-500/20',
  [AssetStatus.Frozen]: 'bg-red-500/10 text-red-400 border-red-500/20',
  [AssetStatus.Delisted]: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
};

const statusDotColors: Record<number, string> = {
  [AssetStatus.Pending]: 'bg-yellow-400',
  [AssetStatus.Verified]: 'bg-blue-400',
  [AssetStatus.Tokenized]: 'bg-green-400',
  [AssetStatus.Frozen]: 'bg-red-400',
  [AssetStatus.Delisted]: 'bg-zinc-400',
};

const formatLamports = (lamports: BN): string => {
  const sol = lamports.toNumber() / 1e9;
  if (sol >= 1000) return `${(sol / 1000).toFixed(1)}K SOL`;
  if (sol >= 1) return `${sol.toFixed(2)} SOL`;
  return `${(sol * 1000).toFixed(2)} mSOL`;
};



export const AssetCard: React.FC<AssetCardProps> = ({ asset, onBuy, onDetails }) => {
  const statusNum = parseAssetStatus(asset.status);
  const typeNum = parseAssetType(asset.assetType);
  const soldFractions = asset.totalFractions.sub(asset.availableFractions);
  const soldPercentage = asset.totalFractions.gt(new BN(0))
    ? soldFractions.mul(new BN(100)).div(asset.totalFractions).toNumber()
    : 0;

  return (
    <div
      className="group relative bg-zinc-900/50 rounded-xl border border-zinc-800 hover:border-zinc-700 transition-all duration-300 overflow-hidden cursor-pointer"
      onClick={onDetails}
    >
      {/* Type gradient header */}
      <div className="h-2 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />

      <div className="p-5 space-y-4">
        {/* Header: Type + Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-zinc-400">
            {assetTypeIcons[typeNum]}
            <span className="text-sm font-medium">{getAssetTypeName(typeNum)}</span>
          </div>
          <span
            className={cn(
              'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border',
              statusColors[statusNum]
            )}
          >
            <span className={cn('w-1.5 h-1.5 rounded-full', statusDotColors[statusNum])} />
            {getAssetStatusName(statusNum)}
          </span>
        </div>

        {/* Asset ID / Title */}
        <div>
          <h3 className="text-lg font-semibold text-white truncate">{asset.assetId}</h3>
          {asset.location && (
            <div className="flex items-center gap-1 mt-1 text-sm text-zinc-500">
              <IconMapPin className="w-3.5 h-3.5" />
              <span className="truncate">{asset.location}</span>
            </div>
          )}
        </div>

        {/* Valuation */}
        <div className="bg-zinc-800/50 rounded-lg p-3 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-zinc-400">Valuation</span>
            <span className="text-white font-medium">{formatLamports(asset.valuation)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-zinc-400">Price/Fraction</span>
            <span className="text-white font-medium">{formatLamports(asset.pricePerFraction)}</span>
          </div>
        </div>

        {/* Fraction progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-zinc-400 flex items-center gap-1">
              <IconChartPie className="w-3.5 h-3.5" />
              Fractions Sold
            </span>
            <span className="text-zinc-300">
              {soldFractions.toString()}/{asset.totalFractions.toString()}
            </span>
          </div>
          <div className="w-full bg-zinc-800 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(soldPercentage, 100)}%` }}
            />
          </div>
          <p className="text-xs text-zinc-500 text-right">{soldPercentage}% sold</p>
        </div>

        {/* Actions */}
        {statusNum === AssetStatus.Tokenized && asset.availableFractions.gt(new BN(0)) && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onBuy?.();
            }}
            className="w-full py-2.5 bg-white text-black rounded-lg font-medium text-sm hover:bg-zinc-200 transition-colors"
          >
            Buy Fractions
          </button>
        )}

        {statusNum === AssetStatus.Pending && (
          <div className="text-center py-2 text-sm text-yellow-400/70">
            Awaiting Verification
          </div>
        )}

        {statusNum === AssetStatus.Verified && (
          <div className="text-center py-2 text-sm text-blue-400/70">
            Ready to Tokenize
          </div>
        )}
      </div>
    </div>
  );
};

'use client';

import React, { useEffect, useState } from 'react';
import { PublicKey } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';
import { useWallet } from '@solana/wallet-adapter-react';
import {
  Asset,
  AssetStatus,
  getAssetTypeName,
  getAssetStatusName,
  deriveOwnershipPda,
  parseAssetStatus,
  parseAssetType,
} from '@/types/asset-tokenization';
import { useAssetProgram } from './hooks/useAssetProgram';
import { TokenizeAssetButton } from './TokenizeAssetButton';
import { cn } from '@/lib/utils';
import {
  IconMapPin,
  IconExternalLink,
  IconChartPie,
  IconCalendar,
  IconShield,
  IconArrowLeft,
  IconLoader2,
} from '@tabler/icons-react';

interface AssetDetailsProps {
  asset: Asset;
  assetPubkey: PublicKey;
  onBack: () => void;
  onBuy: () => void;
  onSell?: () => void;
  onTokenize?: () => void;
}

const statusColors: Record<number, string> = {
  [AssetStatus.Pending]: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  [AssetStatus.Verified]: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  [AssetStatus.Tokenized]: 'bg-green-500/10 text-green-400 border-green-500/20',
  [AssetStatus.Frozen]: 'bg-red-500/10 text-red-400 border-red-500/20',
  [AssetStatus.Delisted]: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
};

const formatLamports = (lamports: BN): string => {
  const sol = lamports.toNumber() / 1e9;
  if (sol >= 1000) return `${(sol / 1000).toFixed(2)}K SOL`;
  return `${sol.toFixed(4)} SOL`;
};



export const AssetDetails: React.FC<AssetDetailsProps> = ({
  asset,
  assetPubkey,
  onBack,
  onBuy,
  onSell,
  onTokenize,
}) => {
  const { publicKey } = useWallet();
  const { program, programId } = useAssetProgram();
  const [userOwnership, setUserOwnership] = useState<BN | null>(null);
  const [loadingOwnership, setLoadingOwnership] = useState(true);

  const statusNum = parseAssetStatus(asset.status);
  const typeNum = parseAssetType(asset.assetType);
  const isOwner = publicKey && asset.owner.equals(publicKey);
  const soldFractions = asset.totalFractions.sub(asset.availableFractions);
  const soldPercentage = asset.totalFractions.gt(new BN(0))
    ? soldFractions.mul(new BN(100)).div(asset.totalFractions).toNumber()
    : 0;

  useEffect(() => {
    const fetchOwnership = async () => {
      if (!program || !publicKey) {
        setLoadingOwnership(false);
        return;
      }

      try {
        const [ownershipPda] = deriveOwnershipPda(assetPubkey, publicKey, programId);
        const ownership = await program.account.ownership.fetch(ownershipPda);
        setUserOwnership(ownership.fractionsOwned as BN);
      } catch {
        setUserOwnership(null);
      } finally {
        setLoadingOwnership(false);
      }
    };

    fetchOwnership();
  }, [program, publicKey, assetPubkey, programId]);

  return (
    <div className="space-y-6">
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors text-sm"
      >
        <IconArrowLeft className="w-4 h-4" />
        Back to assets
      </button>

      {/* Header */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-white">{asset.assetId}</h1>
              <span
                className={cn(
                  'inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border',
                  statusColors[statusNum]
                )}
              >
                {getAssetStatusName(statusNum)}
              </span>
            </div>
            <div className="flex items-center gap-4 text-zinc-400 text-sm">
              <span className="flex items-center gap-1">
                <IconShield className="w-4 h-4" />
                {getAssetTypeName(typeNum)}
              </span>
              {asset.location && (
                <span className="flex items-center gap-1">
                  <IconMapPin className="w-4 h-4" />
                  {asset.location}
                </span>
              )}
              <span className="flex items-center gap-1">
                <IconCalendar className="w-4 h-4" />
                {new Date(asset.createdAt.toNumber() * 1000).toLocaleDateString()}
              </span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-white">{formatLamports(asset.valuation)}</p>
            <p className="text-sm text-zinc-400">Total Valuation</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Fraction Stats */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <IconChartPie className="w-5 h-5 text-blue-400" />
              Fraction Details
            </h3>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="bg-zinc-800/50 rounded-lg p-3">
                <p className="text-xs text-zinc-500">Total</p>
                <p className="text-lg font-bold text-white">{asset.totalFractions.toString()}</p>
              </div>
              <div className="bg-zinc-800/50 rounded-lg p-3">
                <p className="text-xs text-zinc-500">Available</p>
                <p className="text-lg font-bold text-green-400">{asset.availableFractions.toString()}</p>
              </div>
              <div className="bg-zinc-800/50 rounded-lg p-3">
                <p className="text-xs text-zinc-500">Sold</p>
                <p className="text-lg font-bold text-blue-400">{soldFractions.toString()}</p>
              </div>
              <div className="bg-zinc-800/50 rounded-lg p-3">
                <p className="text-xs text-zinc-500">Price/Fraction</p>
                <p className="text-lg font-bold text-white">{formatLamports(asset.pricePerFraction)}</p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="space-y-2">
              <div className="w-full bg-zinc-800 rounded-full h-3">
                <div
                  className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all"
                  style={{ width: `${Math.min(soldPercentage, 100)}%` }}
                />
              </div>
              <p className="text-sm text-zinc-400">{soldPercentage}% sold</p>
            </div>
          </div>

          {/* Metadata */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 space-y-3">
            <h3 className="text-lg font-semibold text-white mb-4">Asset Information</h3>

            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b border-zinc-800">
                <span className="text-sm text-zinc-400">Owner</span>
                <span className="text-sm text-white font-mono">
                  {asset.owner.toBase58().slice(0, 8)}...{asset.owner.toBase58().slice(-4)}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-zinc-800">
                <span className="text-sm text-zinc-400">Token Mint</span>
                <span className="text-sm text-white font-mono">
                  {asset.tokenMint.toBase58() === '11111111111111111111111111111111'
                    ? 'Not yet minted'
                    : `${asset.tokenMint.toBase58().slice(0, 8)}...${asset.tokenMint.toBase58().slice(-4)}`}
                </span>
              </div>
              {asset.metadataUri && (
                <div className="flex justify-between py-2 border-b border-zinc-800">
                  <span className="text-sm text-zinc-400">Metadata</span>
                  <a
                    href={asset.metadataUri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-400 hover:underline flex items-center gap-1"
                  >
                    View <IconExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
              {asset.documentsUri && (
                <div className="flex justify-between py-2 border-b border-zinc-800">
                  <span className="text-sm text-zinc-400">Documents</span>
                  <a
                    href={asset.documentsUri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-400 hover:underline flex items-center gap-1"
                  >
                    View <IconExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
              <div className="flex justify-between py-2">
                <span className="text-sm text-zinc-400">Document Hash</span>
                <span className="text-sm text-zinc-300 font-mono">
                  {asset.documentHash.slice(0, 8).map((b) => b.toString(16).padStart(2, '0')).join('')}...
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="space-y-6">
          {/* Your Ownership */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
            <h3 className="text-sm font-semibold text-zinc-400 mb-3">Your Position</h3>
            {loadingOwnership ? (
              <IconLoader2 className="w-5 h-5 animate-spin text-zinc-400" />
            ) : userOwnership && userOwnership.gt(new BN(0)) ? (
              <div className="space-y-2">
                <p className="text-2xl font-bold text-white">{userOwnership.toString()}</p>
                <p className="text-sm text-zinc-400">fractions owned</p>
                <p className="text-sm text-green-400">
                  ≈ {formatLamports(userOwnership.mul(asset.pricePerFraction))}
                </p>
              </div>
            ) : (
              <p className="text-sm text-zinc-500">You don&apos;t own any fractions yet</p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            {statusNum === AssetStatus.Tokenized && asset.availableFractions.gt(new BN(0)) && (
              <button
                onClick={onBuy}
                className="w-full py-3 bg-green-600 text-white rounded-lg font-medium text-sm hover:bg-green-700 transition-colors"
              >
                Buy Fractions
              </button>
            )}

            {userOwnership && userOwnership.gt(new BN(0)) && onSell && (
              <button
                onClick={onSell}
                className="w-full py-3 bg-orange-600 text-white rounded-lg font-medium text-sm hover:bg-orange-700 transition-colors"
              >
                Sell Fractions
              </button>
            )}

            {isOwner && statusNum === AssetStatus.Verified && (
              <TokenizeAssetButton
                asset={asset}
                assetPubkey={assetPubkey}
                onSuccess={onTokenize}
                className="w-full py-3 text-sm"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

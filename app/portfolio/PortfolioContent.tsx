'use client';

import React, { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { BN } from '@coral-xyz/anchor';
import { useMyPortfolio, OwnershipAccount } from '@/components/asset-tokenization/hooks/useMyPortfolio';
import { useAssetProgram } from '@/components/asset-tokenization/hooks/useAssetProgram';
import { Asset, getAssetTypeName, parseAssetType } from '@/types/asset-tokenization';
import { SellFractionsModal } from '@/components/asset-tokenization/SellFractionsModal';
import { OwnershipTransfer } from '@/components/asset-tokenization/OwnershipTransfer';
import {
  IconBriefcase,
  IconLoader2,
  IconMoodEmpty,
  IconCurrencyDollar,
  IconTransfer,
  IconWallet,
} from '@tabler/icons-react';

const formatLamports = (lamports: BN): string => {
  const sol = lamports.toNumber() / 1e9;
  if (sol >= 1000) return `${(sol / 1000).toFixed(2)}K SOL`;
  return `${sol.toFixed(4)} SOL`;
};



interface HoldingWithAsset {
  ownership: OwnershipAccount;
  asset: Asset | null;
}

export default function PortfolioContent() {
  const { publicKey } = useWallet();
  const { program } = useAssetProgram();
  const { holdings, loading, refetch } = useMyPortfolio();
  const [holdingsWithAssets, setHoldingsWithAssets] = useState<HoldingWithAsset[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [sellModal, setSellModal] = useState<{ holding: HoldingWithAsset } | null>(null);
  const [transferModal, setTransferModal] = useState<{ holding: HoldingWithAsset } | null>(null);

  useEffect(() => {
    const fetchAssets = async () => {
      if (!program || holdings.length === 0) {
        setHoldingsWithAssets([]);
        return;
      }

      setLoadingAssets(true);

      const results = await Promise.all(
        holdings.map(async (h) => {
          try {
            const assetData = await program.account.asset.fetch(h.account.asset);
            return { ownership: h, asset: assetData as unknown as Asset };
          } catch {
            return { ownership: h, asset: null };
          }
        })
      );

      setHoldingsWithAssets(results);
      setLoadingAssets(false);
    };

    fetchAssets();
  }, [program, holdings]);

  if (!publicKey) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
        <IconWallet className="w-12 h-12 mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Connect Your Wallet</h2>
        <p className="text-sm">Connect your wallet to view your portfolio</p>
      </div>
    );
  }

  if (loading || loadingAssets) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
        <IconLoader2 className="w-8 h-8 animate-spin mb-4" />
        <p className="text-sm">Loading your portfolio...</p>
      </div>
    );
  }

  const totalValue = holdingsWithAssets.reduce((sum, h) => {
    if (!h.asset) return sum;
    return sum.add(h.ownership.account.fractionsOwned.mul(h.asset.pricePerFraction));
  }, new BN(0));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <IconBriefcase className="w-7 h-7 text-purple-400" />
          My Portfolio
        </h1>
        <p className="text-sm text-zinc-400 mt-1">
          Your fractional ownership positions
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
          <p className="text-sm text-zinc-400 mb-1">Total Holdings</p>
          <p className="text-2xl font-bold text-white">{holdingsWithAssets.length}</p>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
          <p className="text-sm text-zinc-400 mb-1">Portfolio Value</p>
          <p className="text-2xl font-bold text-green-400">{formatLamports(totalValue)}</p>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
          <p className="text-sm text-zinc-400 mb-1">Wallet</p>
          <p className="text-sm font-mono text-white truncate">{publicKey.toBase58()}</p>
        </div>
      </div>

      {/* Holdings */}
      {holdingsWithAssets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-zinc-500">
          <IconMoodEmpty className="w-12 h-12 mb-4" />
          <p className="text-lg font-medium text-white">No holdings yet</p>
          <p className="text-sm mt-1">Visit the marketplace to buy fractions</p>
        </div>
      ) : (
        <div className="space-y-3">
          {holdingsWithAssets.map((h) => {
            const asset = h.asset;
            if (!asset) return null;

            const value = h.ownership.account.fractionsOwned.mul(asset.pricePerFraction);
            const ownershipPct = asset.totalFractions.gt(new BN(0))
              ? h.ownership.account.fractionsOwned.mul(new BN(10000)).div(asset.totalFractions).toNumber() / 100
              : 0;

            return (
              <div
                key={h.ownership.publicKey.toBase58()}
                className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-lg font-semibold text-white">{asset.assetId}</h3>
                      <span className="px-2 py-0.5 bg-zinc-800 text-zinc-400 rounded text-xs">
                        {getAssetTypeName(parseAssetType(asset.assetType))}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-zinc-400">
                      <span>{h.ownership.account.fractionsOwned.toString()} fractions</span>
                      <span>{ownershipPct.toFixed(2)}% ownership</span>
                      <span className="text-green-400 font-medium">≈ {formatLamports(value)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSellModal({ holding: h })}
                      className="flex items-center gap-1.5 px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 transition-colors"
                    >
                      <IconCurrencyDollar className="w-4 h-4" />
                      Sell
                    </button>
                    <button
                      onClick={() => setTransferModal({ holding: h })}
                      className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors"
                    >
                      <IconTransfer className="w-4 h-4" />
                      Transfer
                    </button>
                  </div>
                </div>

                {/* Ownership bar */}
                <div className="mt-3">
                  <div className="w-full bg-zinc-800 rounded-full h-1.5">
                    <div
                      className="bg-purple-500 h-1.5 rounded-full transition-all"
                      style={{ width: `${Math.min(ownershipPct, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Sell Modal */}
      {sellModal && sellModal.holding.asset && (
        <SellFractionsModal
          asset={sellModal.holding.asset}
          assetPubkey={sellModal.holding.ownership.account.asset}
          ownership={sellModal.holding.ownership.account}
          isOpen={!!sellModal}
          onClose={() => setSellModal(null)}
          onSuccess={refetch}
        />
      )}

      {/* Transfer Modal */}
      {transferModal && transferModal.holding.asset && (
        <OwnershipTransfer
          asset={transferModal.holding.asset}
          assetPubkey={transferModal.holding.ownership.account.asset}
          ownership={transferModal.holding.ownership.account}
          isOpen={!!transferModal}
          onClose={() => setTransferModal(null)}
          onSuccess={refetch}
        />
      )}
    </div>
  );
}

'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { PublicKey } from '@solana/web3.js';
import { useRouter } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import { BN } from '@coral-xyz/anchor';
import { useAssetProgram } from '@/features/assets/hooks/useAssetProgram';
import { AssetDetails } from '@/features/assets/components/AssetDetails';
import { BuyFractionsModal } from '@/features/assets/components/BuyFractionsModal';
import { SellFractionsModal } from '@/features/assets/components/SellFractionsModal';
import { DocumentUpload } from '@/features/assets/components/DocumentUpload';
import {
  Asset,
  AssetStatus,
  parseAssetStatus,
  deriveOwnershipPda,
} from '@/features/assets/types';
import { IconLoader2 } from '@tabler/icons-react';

interface AssetDetailViewProps {
  assetPubkey: PublicKey;
}

export const AssetDetailView: React.FC<AssetDetailViewProps> = ({ assetPubkey }) => {
  const router = useRouter();
  const { publicKey } = useWallet();
  const { program, programId } = useAssetProgram();
  const [asset, setAsset] = useState<Asset | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [showSellModal, setShowSellModal] = useState(false);
  const [showDocUpload, setShowDocUpload] = useState(false);
  const [ownership, setOwnership] = useState<{ fractionsOwned: BN; asset: PublicKey; owner: PublicKey; purchasedAt: BN; bump: number } | null>(null);

  const fetchAsset = useCallback(async () => {
    if (!program) return;

    setLoading(true);
    setError(null);

    try {
      const assetData = await program.account.asset.fetch(assetPubkey);
      setAsset(assetData as unknown as Asset);

      // Fetch user's ownership if connected
      if (publicKey) {
        try {
          const [ownershipPda] = deriveOwnershipPda(assetPubkey, publicKey, programId);
          const ownershipData = await program.account.ownership.fetch(ownershipPda);
          setOwnership(ownershipData as unknown as typeof ownership);
        } catch {
          setOwnership(null);
        }
      }
    } catch (err: unknown) {
      console.error('Failed to fetch asset:', err);
      setError(err instanceof Error ? err.message : 'Failed to load asset');
    } finally {
      setLoading(false);
    }
  }, [program, assetPubkey, publicKey, programId]);

  useEffect(() => {
    fetchAsset();
  }, [fetchAsset]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
        <IconLoader2 className="w-8 h-8 animate-spin mb-4" />
        <p className="text-sm">Loading asset details...</p>
      </div>
    );
  }

  if (error || !asset) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
        <p className="text-lg font-medium text-white">Asset Not Found</p>
        <p className="text-sm mt-1">{error || 'This asset does not exist on-chain.'}</p>
        <button
          onClick={() => router.push('/marketplace')}
          className="mt-4 px-4 py-2 bg-zinc-800 text-white rounded-lg text-sm hover:bg-zinc-700 transition-colors"
        >
          Back to Marketplace
        </button>
      </div>
    );
  }

  const isOwner = publicKey && asset.owner.equals(publicKey);
  const statusNum = parseAssetStatus(asset.status);

  return (
    <>
      <AssetDetails
        asset={asset}
        assetPubkey={assetPubkey}
        onBack={() => router.push('/marketplace')}
        onBuy={() => setShowBuyModal(true)}
        onSell={() => setShowSellModal(true)}
        onTokenize={fetchAsset}
      />

      {/* Document Upload Button — shown for asset owner */}
      {isOwner && (
        <div className="mt-6">
          <button
            onClick={() => setShowDocUpload(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Add Document
          </button>
        </div>
      )}

      {/* Buy Modal */}
      {showBuyModal && statusNum === AssetStatus.Tokenized && (
        <BuyFractionsModal
          asset={asset}
          assetPubkey={assetPubkey}
          isOpen={showBuyModal}
          onClose={() => setShowBuyModal(false)}
          onSuccess={fetchAsset}
        />
      )}

      {/* Sell Modal */}
      {showSellModal && ownership && (
        <SellFractionsModal
          asset={asset}
          assetPubkey={assetPubkey}
          ownership={ownership}
          isOpen={showSellModal}
          onClose={() => setShowSellModal(false)}
          onSuccess={fetchAsset}
        />
      )}

      {/* Document Upload Modal */}
      {showDocUpload && (
        <DocumentUpload
          asset={asset}
          assetPubkey={assetPubkey}
          isOpen={showDocUpload}
          onClose={() => setShowDocUpload(false)}
          onSuccess={fetchAsset}
        />
      )}
    </>
  );
};

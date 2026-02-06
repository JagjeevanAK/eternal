'use client';

import { useState, useEffect, useCallback } from 'react';
import { useConnection } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { useAssetProgram } from './useAssetProgram';
import { Asset, AssetStatus, AssetType, ASSET_TOKENIZATION_PROGRAM_ID, parseAssetStatus, parseAssetType } from '@/types/asset-tokenization';

export interface AssetAccount {
  publicKey: PublicKey;
  account: Asset;
}

export const useAssets = () => {
  const { program, connection } = useAssetProgram();
  const [assets, setAssets] = useState<AssetAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAssets = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      if (!program) {
        setAssets([]);
        return;
      }

      const allAssets = await program.account.asset.all();
      const mapped: AssetAccount[] = allAssets.map((a: any) => ({
        publicKey: a.publicKey,
        account: {
          owner: a.account.owner,
          assetType: parseAssetType(a.account.assetType),
          status: parseAssetStatus(a.account.status),
          tokenMint: a.account.tokenMint,
          valuation: a.account.valuation,
          totalFractions: a.account.totalFractions,
          availableFractions: a.account.availableFractions,
          pricePerFraction: a.account.pricePerFraction,
          metadataUri: a.account.metadataUri,
          documentsUri: a.account.documentsUri,
          documentHash: a.account.documentHash,
          location: a.account.location,
          createdAt: a.account.createdAt,
          updatedAt: a.account.updatedAt,
          assetId: a.account.assetId,
          bump: a.account.bump,
        },
      }));

      setAssets(mapped);
    } catch (err: any) {
      console.error('Failed to fetch assets:', err);
      setError(err.message || 'Failed to fetch assets');
    } finally {
      setLoading(false);
    }
  }, [program]);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  const getAssetsByStatus = (status: AssetStatus) =>
    assets.filter((a) => a.account.status === status);

  const getAssetsByType = (type: AssetType) =>
    assets.filter((a) => a.account.assetType === type);

  const getAssetsByOwner = (owner: PublicKey) =>
    assets.filter((a) => a.account.owner.equals(owner));

  const getTokenizedAssets = () => getAssetsByStatus(AssetStatus.Tokenized);

  return {
    assets,
    loading,
    error,
    refetch: fetchAssets,
    getAssetsByStatus,
    getAssetsByType,
    getAssetsByOwner,
    getTokenizedAssets,
  };
};

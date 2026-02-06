'use client';

import React, { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { toast } from 'sonner';
import { useAssetProgram } from '../asset-tokenization/hooks/useAssetProgram';
import { useAssets, AssetAccount } from '../asset-tokenization/hooks/useAssets';
import {
  AssetStatus,
  getAssetTypeName,
  getAssetStatusName,
  derivePlatformConfigPda,
  parseAssetStatus,
  parseAssetType,
} from '@/types/asset-tokenization';
import { cn } from '@/lib/utils';
import { IconLoader2, IconShieldCheck, IconMoodEmpty } from '@tabler/icons-react';
import { BN } from '@coral-xyz/anchor';



const formatLamports = (lamports: BN): string => {
  const sol = lamports.toNumber() / 1e9;
  return `${sol.toFixed(2)} SOL`;
};

export const VerifyAsset: React.FC = () => {
  const { program, programId } = useAssetProgram();
  const { publicKey } = useWallet();
  const { assets, loading, refetch } = useAssets();
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  const pendingAssets = assets.filter(
    (a) => parseAssetStatus(a.account.status) === AssetStatus.Pending
  );

  const handleVerify = async (asset: AssetAccount) => {
    if (!program || !publicKey) {
      toast.error('Please connect your wallet');
      return;
    }

    setVerifyingId(asset.publicKey.toBase58());

    try {
      const [platformConfig] = derivePlatformConfigPda(programId);

      const tx = await program.methods
        .verifyAsset()
        .accounts({
          authority: publicKey,
          platformConfig,
          asset: asset.publicKey,
        })
        .rpc();

      toast.success('Asset verified successfully!', {
        description: `TX: ${tx.slice(0, 8)}...`,
      });

      refetch();
    } catch (err: any) {
      console.error('Verify failed:', err);
      toast.error('Failed to verify asset', {
        description: err.message || 'Transaction failed',
      });
    } finally {
      setVerifyingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <IconLoader2 className="w-6 h-6 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (pendingAssets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-zinc-500">
        <IconMoodEmpty className="w-10 h-10 mb-3" />
        <p className="text-sm">No pending assets to verify</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {pendingAssets.map((asset) => (
        <div
          key={asset.publicKey.toBase58()}
          className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4 flex items-center justify-between"
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <h4 className="text-sm font-semibold text-white truncate">
                {asset.account.assetId}
              </h4>
              <span className="px-2 py-0.5 bg-yellow-500/10 text-yellow-400 rounded text-xs border border-yellow-500/20">
                Pending
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs text-zinc-500">
              <span>{getAssetTypeName(parseAssetType(asset.account.assetType))}</span>
              <span>{formatLamports(asset.account.valuation)}</span>
              <span>{asset.account.location || 'No location'}</span>
              <span className="font-mono">
                Owner: {asset.account.owner.toBase58().slice(0, 6)}...
              </span>
            </div>
          </div>
          <button
            onClick={() => handleVerify(asset)}
            disabled={verifyingId === asset.publicKey.toBase58()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 ml-4 shrink-0"
          >
            {verifyingId === asset.publicKey.toBase58() ? (
              <IconLoader2 className="w-4 h-4 animate-spin" />
            ) : (
              <IconShieldCheck className="w-4 h-4" />
            )}
            Verify
          </button>
        </div>
      ))}
    </div>
  );
};

'use client';

import React, { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';
import { toast } from 'sonner';
import { useAssetProgram } from './hooks/useAssetProgram';
import {
  Asset,
  Ownership,
  derivePlatformConfigPda,
  deriveOwnershipPda,
} from '@/types/asset-tokenization';
import { IconX, IconLoader2, IconCurrencyDollar } from '@tabler/icons-react';
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
} from '@solana/spl-token';

interface SellFractionsModalProps {
  asset: Asset;
  assetPubkey: PublicKey;
  ownership: Ownership;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const formatLamports = (lamports: BN): string => {
  const sol = lamports.toNumber() / 1e9;
  return `${sol.toFixed(4)} SOL`;
};

export const SellFractionsModal: React.FC<SellFractionsModalProps> = ({
  asset,
  assetPubkey,
  ownership,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { program, programId } = useAssetProgram();
  const { publicKey } = useWallet();
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const fractionsToSell = parseInt(amount) || 0;
  const maxSellable = ownership.fractionsOwned.toNumber();
  const totalRevenue = asset.pricePerFraction.mul(new BN(fractionsToSell));

  const handleSell = async () => {
    if (!program || !publicKey) {
      toast.error('Please connect your wallet');
      return;
    }

    if (fractionsToSell <= 0 || fractionsToSell > maxSellable) {
      toast.error(`Please enter a valid amount (1-${maxSellable})`);
      return;
    }

    setLoading(true);

    try {
      const [platformConfig] = derivePlatformConfigPda(programId);
      const config = await program.account.platformConfig.fetch(platformConfig);

      const sellerTokenAccount = await getAssociatedTokenAddress(
        asset.tokenMint,
        publicKey
      );

      const assetTokenAccount = await getAssociatedTokenAddress(
        asset.tokenMint,
        assetPubkey,
        true
      );

      const [ownershipPda] = deriveOwnershipPda(assetPubkey, publicKey, programId);

      const tx = await program.methods
        .sellFractions(new BN(fractionsToSell))
        .accounts({
          seller: publicKey,
          platformConfig,
          asset: assetPubkey,
          sellerTokenAccount,
          assetTokenAccount,
          tokenMint: asset.tokenMint,
          ownership: ownershipPda,
          treasury: config.treasury,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: PublicKey.default,
        })
        .rpc();

      toast.success('Fractions sold successfully!', {
        description: `Sold ${fractionsToSell} fractions. TX: ${tx.slice(0, 8)}...`,
      });

      setAmount('');
      onSuccess?.();
      onClose();
    } catch (err: any) {
      console.error('Sell failed:', err);
      toast.error('Failed to sell fractions', {
        description: err.message || 'Transaction failed',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-zinc-900 border border-zinc-800 rounded-xl p-6 w-full max-w-md mx-4 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <IconCurrencyDollar className="w-5 h-5 text-orange-400" />
            Sell Fractions
          </h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-white transition-colors">
            <IconX className="w-5 h-5" />
          </button>
        </div>

        {/* Ownership Info */}
        <div className="bg-zinc-800/50 rounded-lg p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-zinc-400">Asset</span>
            <span className="text-white font-medium">{asset.assetId}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-zinc-400">Your Holdings</span>
            <span className="text-white font-medium">{ownership.fractionsOwned.toString()} fractions</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-zinc-400">Current Price</span>
            <span className="text-white font-medium">{formatLamports(asset.pricePerFraction)}</span>
          </div>
        </div>

        {/* Amount Input */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Fractions to Sell
          </label>
          <div className="relative">
            <input
              type="number"
              min="1"
              max={maxSellable}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount..."
              className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 text-sm"
            />
            <button
              type="button"
              onClick={() => setAmount(maxSellable.toString())}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-orange-400 hover:text-orange-300"
            >
              MAX
            </button>
          </div>
        </div>

        {/* Revenue Summary */}
        {fractionsToSell > 0 && (
          <div className="bg-zinc-800/50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">{fractionsToSell} × {formatLamports(asset.pricePerFraction)}</span>
              <span className="text-white font-medium">{formatLamports(totalRevenue)}</span>
            </div>
            <div className="border-t border-zinc-700 pt-2 flex justify-between text-sm">
              <span className="text-zinc-300 font-medium">You Receive (est.)</span>
              <span className="text-green-400 font-bold">{formatLamports(totalRevenue)}</span>
            </div>
            <p className="text-xs text-zinc-500">* Trading fees will be deducted</p>
          </div>
        )}

        {/* Sell Button */}
        <button
          onClick={handleSell}
          disabled={loading || fractionsToSell <= 0 || fractionsToSell > maxSellable}
          className="w-full flex items-center justify-center gap-2 py-3 bg-orange-600 text-white rounded-lg font-medium text-sm hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <IconLoader2 className="w-4 h-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <IconCurrencyDollar className="w-4 h-4" />
              Sell {fractionsToSell > 0 ? `${fractionsToSell} Fractions` : 'Fractions'}
            </>
          )}
        </button>
      </div>
    </div>
  );
};

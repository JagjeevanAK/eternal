'use client';

import React, { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';
import { toast } from 'sonner';
import { useAssetProgram } from './hooks/useAssetProgram';
import {
  Asset,
  derivePlatformConfigPda,
  deriveOwnershipPda,
} from '@/types/asset-tokenization';
import { IconX, IconLoader2, IconShoppingCart } from '@tabler/icons-react';
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
} from '@solana/spl-token';

interface BuyFractionsModalProps {
  asset: Asset;
  assetPubkey: PublicKey;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const formatLamports = (lamports: BN): string => {
  const sol = lamports.toNumber() / 1e9;
  return `${sol.toFixed(4)} SOL`;
};

export const BuyFractionsModal: React.FC<BuyFractionsModalProps> = ({
  asset,
  assetPubkey,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { program, programId } = useAssetProgram();
  const { publicKey } = useWallet();
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const fractionsToBuy = parseInt(amount) || 0;
  const totalCost = asset.pricePerFraction.mul(new BN(fractionsToBuy));
  const maxFractions = asset.availableFractions.toNumber();

  const handleBuy = async () => {
    if (!program || !publicKey) {
      toast.error('Please connect your wallet');
      return;
    }

    if (fractionsToBuy <= 0 || fractionsToBuy > maxFractions) {
      toast.error(`Please enter a valid amount (1-${maxFractions})`);
      return;
    }

    setLoading(true);

    try {
      const [platformConfig] = derivePlatformConfigPda(programId);
      const config = await program.account.platformConfig.fetch(platformConfig);
      const treasury = config.treasury as PublicKey;

      const buyerTokenAccount = await getAssociatedTokenAddress(
        asset.tokenMint,
        publicKey
      );

      const assetTokenAccount = await getAssociatedTokenAddress(
        asset.tokenMint,
        assetPubkey,
        true
      );

      const [ownership] = deriveOwnershipPda(assetPubkey, publicKey, programId);

      const tx = await program.methods
        .buyFractions(new BN(fractionsToBuy))
        .accounts({
          buyer: publicKey,
          platformConfig,
          asset: assetPubkey,
          assetOwner: asset.owner,
          assetTokenAccount,
          buyerTokenAccount,
          tokenMint: asset.tokenMint,
          ownership,
          treasury,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: PublicKey.default,
        })
        .rpc();

      toast.success('Fractions purchased successfully!', {
        description: `Bought ${fractionsToBuy} fractions. TX: ${tx.slice(0, 8)}...`,
      });

      setAmount('');
      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      console.error('Buy failed:', err);
      toast.error('Failed to buy fractions', {
        description: err instanceof Error ? err.message : 'Transaction failed',
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
            <IconShoppingCart className="w-5 h-5 text-green-400" />
            Buy Fractions
          </h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-white transition-colors">
            <IconX className="w-5 h-5" />
          </button>
        </div>

        {/* Asset Info */}
        <div className="bg-zinc-800/50 rounded-lg p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-zinc-400">Asset</span>
            <span className="text-white font-medium">{asset.assetId}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-zinc-400">Price/Fraction</span>
            <span className="text-white font-medium">{formatLamports(asset.pricePerFraction)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-zinc-400">Available</span>
            <span className="text-white font-medium">
              {asset.availableFractions.toString()} / {asset.totalFractions.toString()}
            </span>
          </div>
        </div>

        {/* Amount Input */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Number of Fractions
          </label>
          <div className="relative">
            <input
              type="number"
              min="1"
              max={maxFractions}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount..."
              className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 text-sm"
            />
            <button
              type="button"
              onClick={() => setAmount(maxFractions.toString())}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-blue-400 hover:text-blue-300"
            >
              MAX
            </button>
          </div>
        </div>

        {/* Cost Summary */}
        {fractionsToBuy > 0 && (
          <div className="bg-zinc-800/50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">{fractionsToBuy} × {formatLamports(asset.pricePerFraction)}</span>
              <span className="text-white font-medium">{formatLamports(totalCost)}</span>
            </div>
            <div className="border-t border-zinc-700 pt-2 flex justify-between text-sm">
              <span className="text-zinc-300 font-medium">Total Cost</span>
              <span className="text-white font-bold">{formatLamports(totalCost)}</span>
            </div>
          </div>
        )}

        {/* Buy Button */}
        <button
          onClick={handleBuy}
          disabled={loading || fractionsToBuy <= 0 || fractionsToBuy > maxFractions}
          className="w-full flex items-center justify-center gap-2 py-3 bg-green-600 text-white rounded-lg font-medium text-sm hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <IconLoader2 className="w-4 h-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <IconShoppingCart className="w-4 h-4" />
              Buy {fractionsToBuy > 0 ? `${fractionsToBuy} Fractions` : 'Fractions'}
            </>
          )}
        </button>
      </div>
    </div>
  );
};

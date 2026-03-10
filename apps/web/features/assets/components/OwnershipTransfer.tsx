'use client';

import React, { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';
import { toast } from 'sonner';
import { useAssetProgram } from '@/features/assets/hooks/useAssetProgram';
import {
  Asset,
  Ownership,
  derivePlatformConfigPda,
  deriveOwnershipPda,
} from '@/features/assets/types';
import { IconX, IconLoader2, IconTransfer } from '@tabler/icons-react';
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
} from '@solana/spl-token';

interface OwnershipTransferProps {
  asset: Asset;
  assetPubkey: PublicKey;
  ownership: Ownership;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const OwnershipTransfer: React.FC<OwnershipTransferProps> = ({
  asset,
  assetPubkey,
  ownership,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { program, programId } = useAssetProgram();
  const { publicKey } = useWallet();
  const [loading, setLoading] = useState(false);
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');

  if (!isOpen) return null;

  const fractionsToTransfer = parseInt(amount) || 0;
  const maxTransferable = ownership.fractionsOwned.toNumber();

  const handleTransfer = async () => {
    if (!program || !publicKey) {
      toast.error('Please connect your wallet');
      return;
    }

    let recipientPubkey: PublicKey;
    try {
      recipientPubkey = new PublicKey(recipient);
    } catch {
      toast.error('Invalid recipient wallet address');
      return;
    }

    if (recipientPubkey.equals(publicKey)) {
      toast.error('Cannot transfer to yourself');
      return;
    }

    if (fractionsToTransfer <= 0 || fractionsToTransfer > maxTransferable) {
      toast.error(`Please enter a valid amount (1-${maxTransferable})`);
      return;
    }

    setLoading(true);

    try {
      const [platformConfig] = derivePlatformConfigPda(programId);

      const fromTokenAccount = await getAssociatedTokenAddress(asset.tokenMint, publicKey);
      const toTokenAccount = await getAssociatedTokenAddress(asset.tokenMint, recipientPubkey);

      const [fromOwnership] = deriveOwnershipPda(assetPubkey, publicKey, programId);
      const [toOwnership] = deriveOwnershipPda(assetPubkey, recipientPubkey, programId);

      const tx = await program.methods
        .transferOwnership(new BN(fractionsToTransfer))
        .accounts({
          from: publicKey,
          to: recipientPubkey,
          platformConfig,
          asset: assetPubkey,
          fromTokenAccount,
          toTokenAccount,
          tokenMint: asset.tokenMint,
          fromOwnership,
          toOwnership,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: PublicKey.default,
        })
        .rpc();

      toast.success('Transfer successful!', {
        description: `${fractionsToTransfer} fractions transferred. TX: ${tx.slice(0, 8)}...`,
      });

      setRecipient('');
      setAmount('');
      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      console.error('Transfer failed:', err);
      toast.error('Failed to transfer', {
        description: err instanceof Error ? err.message : 'Transaction failed',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-xl p-6 w-full max-w-md mx-4 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <IconTransfer className="w-5 h-5 text-secondary" />
            Transfer Fractions
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <IconX className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-muted rounded-lg p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Asset</span>
            <span className="text-foreground font-medium">{asset.assetId}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Your Holdings</span>
            <span className="text-foreground font-medium">{ownership.fractionsOwned.toString()} fractions</span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-2">
            Recipient Wallet Address
          </label>
          <input
            type="text"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="Paste Solana wallet address..."
            className="w-full bg-muted border border-border rounded-lg px-4 py-3 text-foreground placeholder-muted-foreground focus:outline-none focus:border-ring text-sm font-mono"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-2">
            Fractions to Transfer
          </label>
          <div className="relative">
            <input
              type="number"
              min="1"
              max={maxTransferable}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount..."
              className="w-full bg-muted border border-border rounded-lg px-4 py-3 text-foreground placeholder-muted-foreground focus:outline-none focus:border-ring text-sm"
            />
            <button
              type="button"
              onClick={() => setAmount(maxTransferable.toString())}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-secondary hover:opacity-80"
            >
              MAX
            </button>
          </div>
        </div>

        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
          <p className="text-xs text-yellow-400">
            ⚠️ This action is irreversible. Make sure the recipient address is correct.
          </p>
        </div>

        <button
          onClick={handleTransfer}
          disabled={loading || !recipient || fractionsToTransfer <= 0 || fractionsToTransfer > maxTransferable}
          className="w-full flex items-center justify-center gap-2 py-3 bg-secondary text-secondary-foreground rounded-lg font-medium text-sm hover:opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <IconLoader2 className="w-4 h-4 animate-spin" />
              Transferring...
            </>
          ) : (
            <>
              <IconTransfer className="w-4 h-4" />
              Transfer {fractionsToTransfer > 0 ? `${fractionsToTransfer} Fractions` : 'Fractions'}
            </>
          )}
        </button>
      </div>
    </div>
  );
};

'use client';

import React, { useState } from 'react';
import { PublicKey, Keypair, SYSVAR_RENT_PUBKEY, SystemProgram } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from '@solana/spl-token';
import { useWallet } from '@solana/wallet-adapter-react';
import { toast } from 'sonner';
import { useAssetProgram } from './hooks/useAssetProgram';
import {
  Asset,
  AssetStatus,
  derivePlatformConfigPda,
  parseAssetStatus,
} from '@/types/asset-tokenization';
import { IconCoins, IconLoader2, IconX } from '@tabler/icons-react';

// Metaplex Token Metadata Program ID
const TOKEN_METADATA_PROGRAM_ID = new PublicKey(
  'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s'
);

interface TokenizeAssetButtonProps {
  asset: Asset;
  assetPubkey: PublicKey;
  onSuccess?: () => void;
  className?: string;
}

/**
 * Derives the Metaplex metadata PDA for a given mint.
 * seeds = ["metadata", TOKEN_METADATA_PROGRAM_ID, mint]
 */
const deriveMetadataPda = (mint: PublicKey): [PublicKey, number] => {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from('metadata'),
      TOKEN_METADATA_PROGRAM_ID.toBuffer(),
      mint.toBuffer(),
    ],
    TOKEN_METADATA_PROGRAM_ID
  );
};

export const TokenizeAssetButton: React.FC<TokenizeAssetButtonProps> = ({
  asset,
  assetPubkey,
  onSuccess,
  className,
}) => {
  const { program, programId } = useAssetProgram();
  const { publicKey } = useWallet();
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    symbol: '',
    uri: '',
  });

  const statusNum = parseAssetStatus(asset.status);
  const isOwner = publicKey && asset.owner.equals(publicKey);
  const canTokenize = isOwner && statusNum === AssetStatus.Verified;

  if (!canTokenize) return null;

  const handleTokenize = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!program || !publicKey) {
      toast.error('Please connect your wallet');
      return;
    }

    if (!formData.name || !formData.symbol) {
      toast.error('Name and symbol are required');
      return;
    }

    setLoading(true);

    try {
      // Generate a new keypair for the token mint
      const mintKeypair = Keypair.generate();

      const [platformConfig] = derivePlatformConfigPda(programId);

      // The asset token account is the ATA of the asset PDA for the new mint
      const assetTokenAccount = await getAssociatedTokenAddress(
        mintKeypair.publicKey,
        assetPubkey,
        true // allowOwnerOffCurve — asset PDA is not on the ed25519 curve
      );

      // Derive Metaplex metadata PDA
      const [metadataAccount] = deriveMetadataPda(mintKeypair.publicKey);

      const tx = await program.methods
        .tokenizeAsset(formData.name, formData.symbol, formData.uri || '')
        .accounts({
          owner: publicKey,
          platformConfig,
          asset: assetPubkey,
          tokenMint: mintKeypair.publicKey,
          assetTokenAccount,
          metadataAccount,
          tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          rent: SYSVAR_RENT_PUBKEY,
        })
        .signers([mintKeypair])
        .rpc();

      toast.success('Asset tokenized successfully!', {
        description: `Mint: ${mintKeypair.publicKey.toBase58().slice(0, 8)}... TX: ${tx.slice(0, 8)}...`,
      });

      setShowModal(false);
      setFormData({ name: '', symbol: '', uri: '' });
      onSuccess?.();
    } catch (err: any) {
      console.error('Tokenization failed:', err);
      toast.error('Failed to tokenize asset', {
        description: err.message || 'Transaction failed',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium transition-colors ${className || ''}`}
      >
        <IconCoins className="w-4 h-4" />
        Tokenize Asset
      </button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative bg-zinc-900 border border-zinc-800 rounded-xl p-6 w-full max-w-md mx-4 space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <IconCoins className="w-5 h-5 text-purple-400" />
                Tokenize Asset
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-zinc-400 hover:text-white transition-colors"
              >
                <IconX className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-zinc-400">
              Create fractional tokens for this verified asset. This will mint{' '}
              <span className="text-white font-medium">
                {asset.totalFractions.toNumber().toLocaleString()}
              </span>{' '}
              tokens (6 decimals) representing ownership fractions.
            </p>

            <form onSubmit={handleTokenize} className="space-y-4">
              {/* Token Name */}
              <div>
                <label className="block text-sm text-zinc-400 mb-1.5">Token Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Mumbai Land Token"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  maxLength={32}
                  required
                />
              </div>

              {/* Token Symbol */}
              <div>
                <label className="block text-sm text-zinc-400 mb-1.5">Token Symbol *</label>
                <input
                  type="text"
                  value={formData.symbol}
                  onChange={(e) => setFormData({ ...formData, symbol: e.target.value.toUpperCase() })}
                  placeholder="e.g., MLT"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  maxLength={10}
                  required
                />
              </div>

              {/* Token Metadata URI (optional) */}
              <div>
                <label className="block text-sm text-zinc-400 mb-1.5">Metadata URI (optional)</label>
                <input
                  type="url"
                  value={formData.uri}
                  onChange={(e) => setFormData({ ...formData, uri: e.target.value })}
                  placeholder="https://arweave.net/..."
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                />
              </div>

              {/* Info box */}
              <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-3 text-sm text-purple-300">
                <p>A new SPL token mint will be created with the asset PDA as the mint authority. All fractions will be minted to the asset&apos;s token account.</p>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading || !formData.name || !formData.symbol}
                className="w-full py-3 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white font-medium transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <IconLoader2 className="w-4 h-4 animate-spin" />
                    Tokenizing...
                  </>
                ) : (
                  <>
                    <IconCoins className="w-4 h-4" />
                    Tokenize & Mint Fractions
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

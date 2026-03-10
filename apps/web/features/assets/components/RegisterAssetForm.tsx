'use client';

import React, { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { BN } from '@coral-xyz/anchor';
import { PublicKey, SystemProgram } from '@solana/web3.js';
import CryptoJS from 'crypto-js';
import { toast } from 'sonner';
import { useAssetProgram } from '@/features/assets/hooks/useAssetProgram';
import {
  AssetType,
  derivePlatformConfigPda,
  deriveAssetPda,
} from '@/features/assets/types';
import { IconUpload, IconLoader2 } from '@tabler/icons-react';

interface RegisterAssetFormProps {
  onSuccess?: () => void;
}

const assetTypes = [
  { value: AssetType.RealEstate, label: 'Real Estate', desc: 'Land, buildings, apartments' },
  { value: AssetType.Gold, label: 'Gold', desc: 'Gold bars, coins, bullion' },
  { value: AssetType.Infrastructure, label: 'Infrastructure', desc: 'Roads, bridges, power plants' },
  { value: AssetType.Vehicle, label: 'Vehicle', desc: 'Cars, trucks, machinery' },
  { value: AssetType.Art, label: 'Art', desc: 'Paintings, sculptures, collectibles' },
  { value: AssetType.Commodity, label: 'Commodity', desc: 'Agricultural, minerals, etc.' },
  { value: AssetType.Other, label: 'Other', desc: 'Miscellaneous assets' },
];

export const RegisterAssetForm: React.FC<RegisterAssetFormProps> = ({ onSuccess }) => {
  const { program, programId } = useAssetProgram();
  const { publicKey } = useWallet();

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    assetId: '',
    assetType: AssetType.RealEstate as number,
    valuation: '',
    totalFractions: '',
    metadataUri: '',
    documentsUri: '',
    location: '',
    documentContent: '',
  });

  const generateDocumentHash = (content: string): number[] => {
    const hash = CryptoJS.SHA256(content).toString(CryptoJS.enc.Hex);
    const bytes = [];
    for (let i = 0; i < hash.length; i += 2) {
      bytes.push(parseInt(hash.substr(i, 2), 16));
    }
    return bytes;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!program || !publicKey) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (!formData.assetId || !formData.valuation || !formData.totalFractions) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);

    try {
      const valuationLamports = new BN(parseFloat(formData.valuation) * 1e9);
      const totalFractions = new BN(parseInt(formData.totalFractions));
      const documentHash = formData.documentContent
        ? generateDocumentHash(formData.documentContent)
        : Array(32).fill(0);

      const [platformConfig] = derivePlatformConfigPda(programId);
      const [assetPda] = deriveAssetPda(publicKey, formData.assetId, programId);

      // Fetch platform config to get treasury
      const config = await program.account.platformConfig.fetch(platformConfig);
      const treasury = config.treasury as PublicKey;

      const tx = await program.methods
        .registerAsset(
          formData.assetId,
          formData.assetType,
          valuationLamports,
          totalFractions,
          formData.metadataUri || '',
          formData.documentsUri || '',
          formData.location || '',
          documentHash
        )
        .accounts({
          owner: publicKey,
          platformConfig: platformConfig,
          asset: assetPda,
          treasury,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      toast.success('Asset registered successfully!', {
        description: `Transaction: ${tx.slice(0, 8)}...`,
      });

      setFormData({
        assetId: '',
        assetType: AssetType.RealEstate,
        valuation: '',
        totalFractions: '',
        metadataUri: '',
        documentsUri: '',
        location: '',
        documentContent: '',
      });

      onSuccess?.();
    } catch (err: unknown) {
      console.error('Registration failed:', err);
      toast.error('Failed to register asset', {
        description: err instanceof Error ? err.message : 'Transaction failed',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Asset ID */}
      <div>
        <label className="block text-sm font-medium text-muted-foreground mb-2">
          Asset ID <span className="text-destructive">*</span>
        </label>
        <input
          type="text"
          value={formData.assetId}
          onChange={(e) => setFormData({ ...formData, assetId: e.target.value })}
          placeholder="e.g., PROP-001, GOLD-BAR-42"
          maxLength={32}
          className="w-full bg-card border border-border rounded-lg px-4 py-3 text-foreground placeholder-muted-foreground focus:outline-none focus:border-ring text-sm"
          required
        />
        <p className="mt-1 text-xs text-muted-foreground">Unique identifier for your asset (max 32 chars)</p>
      </div>

      {/* Asset Type */}
      <div>
        <label className="block text-sm font-medium text-muted-foreground mb-2">
          Asset Type <span className="text-destructive">*</span>
        </label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {assetTypes.map((type) => (
            <button
              key={type.value}
              type="button"
              onClick={() => setFormData({ ...formData, assetType: type.value })}
              className={`p-3 rounded-lg border text-left transition-all ${
                formData.assetType === type.value
                  ? 'bg-primary/10 border-primary text-foreground'
                  : 'bg-card border-border text-muted-foreground hover:border-ring'
              }`}
            >
              <p className="text-sm font-medium">{type.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{type.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Valuation & Fractions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-2">
            Valuation (SOL) <span className="text-destructive">*</span>
          </label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            value={formData.valuation}
            onChange={(e) => setFormData({ ...formData, valuation: e.target.value })}
            placeholder="e.g., 100"
            className="w-full bg-card border border-border rounded-lg px-4 py-3 text-foreground placeholder-muted-foreground focus:outline-none focus:border-ring text-sm"
            required
          />
          <p className="mt-1 text-xs text-muted-foreground">Total valuation in SOL</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-2">
            Total Fractions <span className="text-destructive">*</span>
          </label>
          <input
            type="number"
            min="1"
            step="1"
            value={formData.totalFractions}
            onChange={(e) => setFormData({ ...formData, totalFractions: e.target.value })}
            placeholder="e.g., 1000"
            className="w-full bg-card border border-border rounded-lg px-4 py-3 text-foreground placeholder-muted-foreground focus:outline-none focus:border-ring text-sm"
            required
          />
          <p className="mt-1 text-xs text-muted-foreground">Number of fractions to divide into</p>
        </div>
      </div>

      {/* Price Preview */}
      {formData.valuation && formData.totalFractions && (
        <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
          <p className="text-sm text-primary">
            Price per fraction:{' '}
            <span className="font-bold">
              {(parseFloat(formData.valuation) / parseInt(formData.totalFractions || '1')).toFixed(6)} SOL
            </span>
          </p>
        </div>
      )}

      {/* Location */}
      <div>
        <label className="block text-sm font-medium text-muted-foreground mb-2">Location</label>
        <input
          type="text"
          value={formData.location}
          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
          placeholder="e.g., Mumbai, Maharashtra, India"
          maxLength={64}
          className="w-full bg-card border border-border rounded-lg px-4 py-3 text-foreground placeholder-muted-foreground focus:outline-none focus:border-ring text-sm"
        />
      </div>

      {/* Metadata URI */}
      <div>
        <label className="block text-sm font-medium text-muted-foreground mb-2">Metadata URI</label>
        <input
          type="url"
          value={formData.metadataUri}
          onChange={(e) => setFormData({ ...formData, metadataUri: e.target.value })}
          placeholder="https://arweave.net/... or ipfs://..."
          className="w-full bg-card border border-border rounded-lg px-4 py-3 text-foreground placeholder-muted-foreground focus:outline-none focus:border-ring text-sm"
        />
        <p className="mt-1 text-xs text-muted-foreground">IPFS or Arweave URI for asset metadata JSON</p>
      </div>

      {/* Documents URI */}
      <div>
        <label className="block text-sm font-medium text-muted-foreground mb-2">Documents URI</label>
        <input
          type="url"
          value={formData.documentsUri}
          onChange={(e) => setFormData({ ...formData, documentsUri: e.target.value })}
          placeholder="https://arweave.net/... or ipfs://..."
          className="w-full bg-card border border-border rounded-lg px-4 py-3 text-foreground placeholder-muted-foreground focus:outline-none focus:border-ring text-sm"
        />
        <p className="mt-1 text-xs text-muted-foreground">URI for legal documents bundle</p>
      </div>

      {/* Document Hash Content */}
      <div>
        <label className="block text-sm font-medium text-muted-foreground mb-2">
          Document Content (for hash verification)
        </label>
        <textarea
          value={formData.documentContent}
          onChange={(e) => setFormData({ ...formData, documentContent: e.target.value })}
          placeholder="Paste document content here to auto-generate SHA256 hash..."
          rows={4}
          className="w-full bg-card border border-border rounded-lg px-4 py-3 text-foreground placeholder-muted-foreground focus:outline-none focus:border-ring text-sm resize-none"
        />
        {formData.documentContent && (
          <p className="mt-1 text-xs text-chart-1">
            Hash: {CryptoJS.SHA256(formData.documentContent).toString(CryptoJS.enc.Hex).slice(0, 16)}...
          </p>
        )}
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={loading || !publicKey}
        className="w-full flex items-center justify-center gap-2 py-3 bg-primary text-primary-foreground rounded-lg font-medium text-sm hover:opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <>
            <IconLoader2 className="w-4 h-4 animate-spin" />
            Registering Asset...
          </>
        ) : (
          <>
            <IconUpload className="w-4 h-4" />
            Register Asset
          </>
        )}
      </button>

      {!publicKey && (
        <p className="text-center text-sm text-muted-foreground">Connect your wallet to register an asset</p>
      )}
    </form>
  );
};

'use client';

import React, { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import CryptoJS from 'crypto-js';
import { toast } from 'sonner';
import { useAssetProgram } from './hooks/useAssetProgram';
import {
  Asset,
  derivePlatformConfigPda,
  deriveDocumentPda,
} from '@/types/asset-tokenization';
import { IconX, IconLoader2, IconFileUpload } from '@tabler/icons-react';

interface DocumentUploadProps {
  asset: Asset;
  assetPubkey: PublicKey;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const DocumentUpload: React.FC<DocumentUploadProps> = ({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  asset: _asset,
  assetPubkey,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { program, programId } = useAssetProgram();
  const { publicKey } = useWallet();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    docType: '',
    uri: '',
    content: '',
  });

  if (!isOpen) return null;

  const generateHash = (content: string): number[] => {
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
      toast.error('Please connect your wallet');
      return;
    }

    if (!formData.docType || !formData.uri) {
      toast.error('Please fill all required fields');
      return;
    }

    setLoading(true);

    try {
      const [platformConfig] = derivePlatformConfigPda(programId);
      const [documentPda] = deriveDocumentPda(assetPubkey, formData.docType, programId);
      const hash = formData.content ? generateHash(formData.content) : Array(32).fill(0);

      const tx = await program.methods
        .addDocument(formData.docType, formData.uri, hash)
        .accounts({
          owner: publicKey,
          platformConfig,
          asset: assetPubkey,
          document: documentPda,
          systemProgram: PublicKey.default,
        })
        .rpc();

      toast.success('Document added successfully!', {
        description: `TX: ${tx.slice(0, 8)}...`,
      });

      setFormData({ docType: '', uri: '', content: '' });
      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      console.error('Document upload failed:', err);
      toast.error('Failed to add document', {
        description: err instanceof Error ? err.message : 'Transaction failed',
      });
    } finally {
      setLoading(false);
    }
  };

  const docTypes = [
    { value: 'title_deed', label: 'Title Deed' },
    { value: 'survey', label: 'Survey Report' },
    { value: 'valuation_report', label: 'Valuation Report' },
    { value: 'insurance', label: 'Insurance Document' },
    { value: 'inspection', label: 'Inspection Certificate' },
    { value: 'legal_opinion', label: 'Legal Opinion' },
    { value: 'other', label: 'Other' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-zinc-900 border border-zinc-800 rounded-xl p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <IconFileUpload className="w-5 h-5 text-blue-400" />
            Add Document
          </h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-white transition-colors">
            <IconX className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Document Type <span className="text-red-400">*</span>
            </label>
            <select
              value={formData.docType}
              onChange={(e) => setFormData({ ...formData, docType: e.target.value })}
              className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-zinc-500 text-sm"
              required
            >
              <option value="">Select type...</option>
              {docTypes.map((dt) => (
                <option key={dt.value} value={dt.value}>
                  {dt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Document URI <span className="text-red-400">*</span>
            </label>
            <input
              type="url"
              value={formData.uri}
              onChange={(e) => setFormData({ ...formData, uri: e.target.value })}
              placeholder="https://arweave.net/... or ipfs://..."
              className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 text-sm"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Document Content (for hash)
            </label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              placeholder="Paste content for SHA256 hash generation..."
              rows={3}
              className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 text-sm resize-none"
            />
            {formData.content && (
              <p className="mt-1 text-xs text-green-400">
                Hash: {CryptoJS.SHA256(formData.content).toString(CryptoJS.enc.Hex).slice(0, 20)}...
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {loading ? (
              <>
                <IconLoader2 className="w-4 h-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <IconFileUpload className="w-4 h-4" />
                Add Document
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';
import { useAssetProgram } from './useAssetProgram';
import { Ownership, ASSET_TOKENIZATION_PROGRAM_ID, deriveOwnershipPda } from '@/types/asset-tokenization';

export interface OwnershipAccount {
  publicKey: PublicKey;
  account: Ownership;
}

export const useMyPortfolio = () => {
  const { program } = useAssetProgram();
  const { publicKey } = useWallet();
  const [holdings, setHoldings] = useState<OwnershipAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPortfolio = useCallback(async () => {
    if (!program || !publicKey) {
      setHoldings([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const allOwnerships = await program.account.ownership.all([
        {
          memcmp: {
            offset: 8 + 32, // discriminator + asset pubkey
            bytes: publicKey.toBase58(),
          },
        },
      ]);

      const mapped: OwnershipAccount[] = allOwnerships.map((o: any) => ({
        publicKey: o.publicKey,
        account: {
          asset: o.account.asset,
          owner: o.account.owner,
          fractionsOwned: o.account.fractionsOwned,
          purchasedAt: o.account.purchasedAt,
          bump: o.account.bump,
        },
      }));

      setHoldings(mapped);
    } catch (err: any) {
      console.error('Failed to fetch portfolio:', err);
      setError(err.message || 'Failed to fetch portfolio');
    } finally {
      setLoading(false);
    }
  }, [program, publicKey]);

  useEffect(() => {
    fetchPortfolio();
  }, [fetchPortfolio]);

  const totalHoldings = holdings.length;

  const totalFractionsOwned = holdings.reduce(
    (sum, h) => sum.add(h.account.fractionsOwned),
    new BN(0)
  );

  return {
    holdings,
    loading,
    error,
    refetch: fetchPortfolio,
    totalHoldings,
    totalFractionsOwned,
  };
};

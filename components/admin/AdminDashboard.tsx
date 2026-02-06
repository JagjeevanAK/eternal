'use client';

import React, { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useAssetProgram } from '../asset-tokenization/hooks/useAssetProgram';
import { derivePlatformConfigPda, PlatformConfig } from '@/types/asset-tokenization';
import { PlatformStats } from './PlatformStats';
import { VerifyAsset } from './VerifyAsset';
import { IconShieldLock, IconAlertTriangle } from '@tabler/icons-react';

export const AdminDashboard: React.FC = () => {
  const { program, programId } = useAssetProgram();
  const { publicKey } = useWallet();
  const [isAuthority, setIsAuthority] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuthority = async () => {
      if (!program || !publicKey) {
        setLoading(false);
        return;
      }

      try {
        const [platformConfigPda] = derivePlatformConfigPda(programId);
        const config = await program.account.platformConfig.fetch(platformConfigPda);
        const authority = config.authority as any;
        setIsAuthority(authority.equals(publicKey));
      } catch {
        setIsAuthority(false);
      } finally {
        setLoading(false);
      }
    };

    checkAuthority();
  }, [program, publicKey, programId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-2 border-zinc-400 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!publicKey) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
        <IconShieldLock className="w-12 h-12 mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Admin Access Required</h2>
        <p className="text-sm">Please connect your wallet to access the admin panel.</p>
      </div>
    );
  }

  if (!isAuthority) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
        <IconAlertTriangle className="w-12 h-12 mb-4 text-red-400" />
        <h2 className="text-xl font-bold text-white mb-2">Unauthorized</h2>
        <p className="text-sm">Your wallet is not the platform authority.</p>
        <p className="text-xs text-zinc-600 mt-2 font-mono">{publicKey.toBase58()}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <IconShieldLock className="w-7 h-7 text-blue-400" />
          Admin Dashboard
        </h1>
        <p className="text-sm text-zinc-400 mt-1">Platform management and asset verification</p>
      </div>

      {/* Platform Stats */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-4">Platform Statistics</h2>
        <PlatformStats />
      </section>

      {/* Pending Verifications */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-4">Pending Verifications</h2>
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
          <VerifyAsset />
        </div>
      </section>
    </div>
  );
};

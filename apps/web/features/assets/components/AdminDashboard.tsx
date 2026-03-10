'use client';

import React, { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { useAssetProgram } from '@/features/assets/hooks/useAssetProgram';
import { derivePlatformConfigPda } from '@/features/assets/types';
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
        const authority = new PublicKey(config.authority as unknown as string | PublicKey);
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
        <div className="animate-spin w-8 h-8 border-2 border-muted-foreground border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!publicKey) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <IconShieldLock className="w-12 h-12 mb-4" />
        <h2 className="text-xl font-bold text-foreground mb-2">Admin Access Required</h2>
        <p className="text-sm">Please connect your wallet to access the admin panel.</p>
      </div>
    );
  }

  if (!isAuthority) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <IconAlertTriangle className="w-12 h-12 mb-4 text-destructive" />
        <h2 className="text-xl font-bold text-foreground mb-2">Unauthorized</h2>
        <p className="text-sm">Your wallet is not the platform authority.</p>
        <p className="text-xs text-muted-foreground mt-2 font-mono">{publicKey.toBase58()}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
          <IconShieldLock className="w-7 h-7 text-primary" />
          Admin Dashboard
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Platform management and asset verification</p>
      </div>

      {/* Platform Stats */}
      <section>
        <h2 className="text-lg font-semibold text-foreground mb-4">Platform Statistics</h2>
        <PlatformStats />
      </section>

      {/* Pending Verifications */}
      <section>
        <h2 className="text-lg font-semibold text-foreground mb-4">Pending Verifications</h2>
        <div className="bg-card border border-border rounded-xl p-6">
          <VerifyAsset />
        </div>
      </section>
    </div>
  );
};

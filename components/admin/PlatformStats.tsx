'use client';

import React, { useEffect, useState } from 'react';
import { useAssetProgram } from '../asset-tokenization/hooks/useAssetProgram';
import { derivePlatformConfigPda, PlatformConfig } from '@/types/asset-tokenization';
import { BN } from '@coral-xyz/anchor';
import { IconTrendingUp, IconCoins, IconFileCheck, IconActivity } from '@tabler/icons-react';

const formatLamports = (lamports: BN | bigint): string => {
  const num = typeof lamports === 'bigint' ? Number(lamports) : lamports.toNumber();
  const sol = num / 1e9;
  if (sol >= 1000000) return `${(sol / 1000000).toFixed(2)}M SOL`;
  if (sol >= 1000) return `${(sol / 1000).toFixed(2)}K SOL`;
  return `${sol.toFixed(2)} SOL`;
};

export const PlatformStats: React.FC = () => {
  const { program, programId } = useAssetProgram();
  const [config, setConfig] = useState<PlatformConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchConfig = async () => {
      if (!program) {
        setLoading(false);
        return;
      }

      try {
        const [platformConfigPda] = derivePlatformConfigPda(programId);
        const data = await program.account.platformConfig.fetch(platformConfigPda);
        setConfig(data as unknown as PlatformConfig);
      } catch (err) {
        console.error('Failed to fetch platform config:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, [program, programId]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5 animate-pulse">
            <div className="h-4 bg-zinc-800 rounded w-1/2 mb-3" />
            <div className="h-8 bg-zinc-800 rounded w-3/4" />
          </div>
        ))}
      </div>
    );
  }

  if (!config) return null;

  const stats = [
    {
      label: 'Total Assets',
      value: config.totalAssets.toString(),
      icon: <IconFileCheck className="w-5 h-5 text-blue-400" />,
      color: 'text-blue-400',
    },
    {
      label: 'Total Volume',
      value: formatLamports(config.totalVolume),
      icon: <IconTrendingUp className="w-5 h-5 text-green-400" />,
      color: 'text-green-400',
    },
    {
      label: 'Registration Fee',
      value: formatLamports(config.registrationFee),
      icon: <IconCoins className="w-5 h-5 text-yellow-400" />,
      color: 'text-yellow-400',
    },
    {
      label: 'Trading Fee',
      value: `${config.tradingFeeBps / 100}%`,
      icon: <IconActivity className="w-5 h-5 text-purple-400" />,
      color: 'text-purple-400',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <div key={stat.label} className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2">
            {stat.icon}
            <span className="text-sm text-zinc-400">{stat.label}</span>
          </div>
          <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
        </div>
      ))}
    </div>
  );
};

import { cn } from '@/lib/utils';
import { SOLANA_CLUSTER, SOLANA_CLUSTER_LABEL, SOLANA_RPC_ENDPOINT } from '@/lib/solana-network';

const badgeClasses: Record<string, string> = {
  localnet: 'border-cyan-400/30 bg-cyan-400/10 text-cyan-200',
  devnet: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  testnet: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  'mainnet-beta': 'border-zinc-500/30 bg-zinc-500/10 text-zinc-200',
};

export function NetworkBadge() {
  return (
    <span
      title={SOLANA_RPC_ENDPOINT}
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
        badgeClasses[SOLANA_CLUSTER]
      )}
    >
      {SOLANA_CLUSTER_LABEL}
    </span>
  );
}

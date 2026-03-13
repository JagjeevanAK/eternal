import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { clusterApiUrl } from '@solana/web3.js';

export type SolanaCluster = 'localnet' | 'devnet' | 'testnet' | 'mainnet-beta';

const normalizeCluster = (value: string | undefined): SolanaCluster => {
  switch ((value ?? 'devnet').toLowerCase()) {
    case 'local':
    case 'localnet':
    case 'localhost':
      return 'localnet';
    case 'testnet':
      return 'testnet';
    case 'mainnet':
    case 'mainnet-beta':
      return 'mainnet-beta';
    default:
      return 'devnet';
  }
};

const getDefaultEndpoint = (cluster: SolanaCluster): string => {
  switch (cluster) {
    case 'localnet':
      return 'http://127.0.0.1:8899';
    case 'testnet':
      return clusterApiUrl(WalletAdapterNetwork.Testnet);
    case 'mainnet-beta':
      return clusterApiUrl(WalletAdapterNetwork.Mainnet);
    default:
      return clusterApiUrl(WalletAdapterNetwork.Devnet);
  }
};

const getClusterLabel = (cluster: SolanaCluster): string => {
  switch (cluster) {
    case 'localnet':
      return 'Localnet';
    case 'testnet':
      return 'Testnet';
    case 'mainnet-beta':
      return 'Mainnet';
    default:
      return 'Devnet';
  }
};

export const SOLANA_CLUSTER = normalizeCluster(process.env.NEXT_PUBLIC_SOLANA_CLUSTER);
export const SOLANA_CLUSTER_LABEL = getClusterLabel(SOLANA_CLUSTER);
export const SOLANA_RPC_ENDPOINT =
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? getDefaultEndpoint(SOLANA_CLUSTER);
export const SOLANA_IS_LOCALNET = SOLANA_CLUSTER === 'localnet';

export const SOLANA_WALLET_NETWORK =
  SOLANA_CLUSTER === 'testnet'
    ? WalletAdapterNetwork.Testnet
    : SOLANA_CLUSTER === 'mainnet-beta'
      ? WalletAdapterNetwork.Mainnet
      : WalletAdapterNetwork.Devnet;

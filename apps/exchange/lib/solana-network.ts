import { clusterApiUrl, type Cluster } from "@solana/web3.js";

const DEFAULT_LOCALNET_RPC_URL = "http://127.0.0.1:8899";
const KNOWN_CLUSTERS = new Set<Cluster>(["devnet", "testnet", "mainnet-beta"]);

export const SOLANA_CLUSTER_LABEL = process.env.NEXT_PUBLIC_SOLANA_CLUSTER ?? "localnet";

export const SOLANA_RPC_URL =
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL ??
  (KNOWN_CLUSTERS.has(SOLANA_CLUSTER_LABEL as Cluster)
    ? clusterApiUrl(SOLANA_CLUSTER_LABEL as Cluster)
    : DEFAULT_LOCALNET_RPC_URL);

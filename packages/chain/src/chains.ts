import { base, baseSepolia } from 'viem/chains';
import { ACTIVE_NETWORK, BASE_RPC_URL } from './network';

const isMainnet = ACTIVE_NETWORK === 'mainnet';
const selectedChain = isMainnet ? base : baseSepolia;

export const activeChain = {
  ...selectedChain,
  rpcUrls: {
    default: {
      http: [BASE_RPC_URL],
    },
  },
} as const;
export const ACTIVE_CHAIN_ID = activeChain.id;

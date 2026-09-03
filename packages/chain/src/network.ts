export const ACTIVE_NETWORK = import.meta.env.VITE_CHAIN === 'mainnet' ? 'mainnet' : 'testnet';

if (!import.meta.env.VITE_BASE_RPC_URL) {
  throw new Error('VITE_BASE_RPC_URL is required');
}

export const BASE_RPC_URL = import.meta.env.VITE_BASE_RPC_URL;

const explorerUrl = ACTIVE_NETWORK === 'mainnet' ? 'https://basescan.org' : 'https://sepolia.basescan.org';

export const EXPLORER_TX_URL = `${explorerUrl}/tx/`;

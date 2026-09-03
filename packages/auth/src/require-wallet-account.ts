import type { CanonicalWallet, WalletAccount } from './wallet';

interface ConnectedWallet {
  wallet: CanonicalWallet;
  account: WalletAccount;
}

export function requireConnectedWallet(isConnected: boolean, wallet: CanonicalWallet | null): ConnectedWallet {
  if (!isConnected || !wallet) {
    throw new Error('Wallet not connected');
  }

  return {
    wallet,
    account: {
      address: wallet.address,
      signTypedData: wallet.signTypedData,
    },
  };
}

export function requireWalletAccount(isConnected: boolean, wallet: CanonicalWallet | null): WalletAccount {
  return requireConnectedWallet(isConnected, wallet).account;
}

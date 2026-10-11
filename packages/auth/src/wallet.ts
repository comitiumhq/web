import type { LinkedAccountWithMetadata, WalletWithMetadata } from '@privy-io/react-auth';
import type { Address } from 'viem';
import { z } from 'zod';

export type CanonicalLinkedWallet = WalletWithMetadata & { id: string; walletIndex: 0 };

export function isCanonicalLinkedWallet(account: LinkedAccountWithMetadata): account is CanonicalLinkedWallet {
  if (account.type !== 'wallet') {
    return false;
  }

  const walletId = z.string().safeParse(account.id);

  return (
    account.chainType === 'ethereum' &&
    account.walletClientType === 'privy' &&
    account.walletIndex === 0 &&
    walletId.success
  );
}

export type CanonicalWallet = {
  id: string;
  address: Address;
};

export type WalletConnectionStatus = 'unknown' | 'connecting' | 'connected' | 'disconnected';

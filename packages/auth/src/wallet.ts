import type { LinkedAccountWithMetadata, SignTypedDataParams, WalletWithMetadata } from '@privy-io/react-auth';
import type { Address, Hex } from 'viem';
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

export type WalletTransactionRequest = {
  chainId: number;
  to: Address;
  data?: Hex;
  value?: bigint;
};

export type WalletAccount = {
  address: Address;
  signTypedData: (input: SignTypedDataParams) => Promise<Hex>;
};

export type CanonicalWallet = WalletAccount & {
  id: string;
  sendTransaction: (input: WalletTransactionRequest) => Promise<Hex>;
  switchChain: (chainId: number) => Promise<void>;
};

export type WalletConnectionStatus = 'unknown' | 'connecting' | 'connected' | 'disconnected';

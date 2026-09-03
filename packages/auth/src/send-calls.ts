import type { Hex } from 'viem';

import type { CanonicalWallet } from './wallet';

import {
  type ProductTransactionSubmissionOptions,
  sendPreparedProductTransaction,
  type WebPreparedTransaction,
} from './wallet-transport';

export { isProductSubmissionUncertain } from '@comitium/schemas/transaction-errors';
export type { WalletAccount } from './wallet';
export type { ProductTransactionSubmissionOptions } from './wallet-transport';

export function sendProductTransaction(wallet: CanonicalWallet, transaction: WebPreparedTransaction): Promise<Hex>;
export function sendProductTransaction(
  wallet: CanonicalWallet,
  transaction: WebPreparedTransaction,
  options: ProductTransactionSubmissionOptions,
): Promise<Hex>;
export async function sendProductTransaction(
  wallet: CanonicalWallet,
  transaction: WebPreparedTransaction,
  options: ProductTransactionSubmissionOptions | null = null,
): Promise<Hex> {
  return sendPreparedProductTransaction(wallet, transaction, options);
}

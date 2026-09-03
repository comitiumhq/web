import { publicClient } from '@comitium/chain/instances';
import { ProductTransactionFailedError, ProductTransactionStageError } from '@comitium/schemas/transaction-errors';
import type { Address, Hex } from 'viem';
import type { CanonicalWallet } from './wallet';

export type WebPreparedTransaction = {
  chainId: number;
  to: Address;
  data: Hex;
  value: bigint;
};

type TransactionSubmittedHandler = (txHash: Hex) => Promise<void> | void;

export interface ProductTransactionSubmissionOptions {
  onSubmitted: TransactionSubmittedHandler;
}

const FOREGROUND_RECEIPT_TIMEOUT_MS = 120_000;

export async function sendPreparedProductTransaction(
  wallet: CanonicalWallet,
  transaction: WebPreparedTransaction,
  options: ProductTransactionSubmissionOptions | null,
): Promise<Hex> {
  try {
    await Promise.all([
      ensureWalletChain(wallet, transaction.chainId),
      publicClient.call({
        account: wallet.address,
        to: transaction.to,
        data: transaction.data,
        value: transaction.value,
      }),
    ]);
  } catch (error) {
    throw new ProductTransactionStageError('preflight', error);
  }

  try {
    const txHash = await wallet.sendTransaction({
      chainId: transaction.chainId,
      to: transaction.to,
      data: transaction.data,
      value: transaction.value,
    });

    await recordSubmission(options, txHash);
    const receipt = await publicClient.waitForTransactionReceipt({
      hash: txHash,
      timeout: FOREGROUND_RECEIPT_TIMEOUT_MS,
    });

    if (receipt.status !== 'success') {
      throw new ProductTransactionFailedError(`Transaction reverted: ${txHash}`);
    }

    return txHash;
  } catch (error) {
    throw new ProductTransactionStageError('submission', error);
  }
}

async function ensureWalletChain(wallet: CanonicalWallet, chainId: number): Promise<void> {
  await wallet.switchChain(chainId);
}

function recordSubmission(options: ProductTransactionSubmissionOptions | null, txHash: Hex): Promise<void> {
  if (options === null) {
    return Promise.resolve();
  }

  return Promise.resolve(options.onSubmitted(txHash));
}

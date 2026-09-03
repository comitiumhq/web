import type { WalletAccount } from '@comitium/auth/send-calls';
import {
  type OnchainTransactionDisposition,
  waitForOperationReceipt,
} from '@comitium/chain/onchain-operation-observer';
import type {
  OnchainForwardRequestSignature,
  OnchainOperationProductState,
  OnchainRequestSignatureRequest,
} from '@comitium/schemas/onchain-operations';
import type { Hex } from 'viem';
import { submitOnchainOperationSignature } from '@/lib/api/onchain-operations';

export interface PreparedRelayedOperation {
  operationId: string;
  state: OnchainOperationProductState;
  signatureRequest: OnchainRequestSignatureRequest | null;
}

export type PreparedOperationDisposition = OnchainTransactionDisposition | { kind: 'completed' };

const TERMINAL_OPERATION_ERRORS = {
  try_again: 'This action did not complete. Please try again.',
} as const;

export async function submitPreparedRelayedOperation(
  orgId: string,
  prepared: PreparedRelayedOperation,
  account: WalletAccount,
): Promise<void> {
  if (prepared.state === 'wallet_confirmation') {
    if (prepared.signatureRequest === null) {
      throw new Error('Prepared on-chain operation is missing its signature request');
    }

    return signAndSubmitOnchainOperationRequest(orgId, prepared.operationId, prepared.signatureRequest, account);
  }

  if (prepared.state === 'confirming' || prepared.state === 'completed') {
    return;
  }

  throw new Error(TERMINAL_OPERATION_ERRORS[prepared.state]);
}

export async function submitAndConfirmPreparedRelayedOperation(
  orgId: string,
  prepared: PreparedRelayedOperation,
  account: WalletAccount,
): Promise<PreparedOperationDisposition> {
  await submitPreparedRelayedOperation(orgId, prepared, account);

  if (prepared.state === 'completed') {
    return { kind: 'completed' };
  }

  return waitForOperationReceipt(prepared.operationId);
}

async function signAndSubmitOnchainOperationRequest(
  orgId: string,
  operationId: string,
  request: OnchainRequestSignatureRequest,
  account: WalletAccount,
): Promise<void> {
  const signature = await signOnchainOperationRequest(account, request);

  await submitOnchainOperationSignature(orgId, operationId, {
    requestId: request.requestId,
    signature,
  });
}

export async function signOnchainOperationRequest(
  account: WalletAccount,
  request: OnchainForwardRequestSignature,
): Promise<Hex> {
  return account.signTypedData({
    domain: request.domain,
    types: request.types,
    primaryType: request.primaryType,
    message: request.message,
  });
}

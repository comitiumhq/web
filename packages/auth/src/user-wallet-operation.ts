import {
  type OnchainTransactionDisposition,
  type ReceiptObservationOptions,
  waitForOperationReceipt,
} from '@comitium/chain/onchain-operation-observer';
import { base64 } from '@scure/base';

export type UserWalletOperationSubmission = OnchainTransactionDisposition;

type UserWalletAuthorizationSignatureProvider = (payload: Uint8Array) => Promise<string>;

let userWalletAuthorizationSignatureProvider: UserWalletAuthorizationSignatureProvider | null = null;
let submitUserWalletTransaction: SubmitUserWalletTransaction | null = null;

type SubmitUserWalletTransaction = (
  operationId: string,
  input: { authorizationSignature: string; requestId: string },
) => Promise<unknown>;

export function registerUserWalletOperationTransport(submit: SubmitUserWalletTransaction): () => void {
  submitUserWalletTransaction = submit;

  return () => {
    if (submitUserWalletTransaction === submit) {
      submitUserWalletTransaction = null;
    }
  };
}

export function registerUserWalletAuthorizationSignatureProvider(
  provider: UserWalletAuthorizationSignatureProvider,
): () => void {
  userWalletAuthorizationSignatureProvider = provider;

  return () => {
    if (userWalletAuthorizationSignatureProvider === provider) {
      userWalletAuthorizationSignatureProvider = null;
    }
  };
}

export async function submitPreparedUserWalletOnchainOperation(
  request: {
    operationId: string;
    requestId: string;
    authorizationPayload: string;
  },
  receiptOptions: ReceiptObservationOptions = {},
): Promise<UserWalletOperationSubmission> {
  const submit = submitUserWalletTransaction;

  if (!submit) {
    throw new Error('User-wallet operation transport is not configured');
  }

  const authorizationSignature = await getUserWalletAuthorizationSignature(base64.decode(request.authorizationPayload));
  await submit(request.operationId, {
    requestId: request.requestId,
    authorizationSignature,
  });

  return waitForOperationReceipt(request.operationId, receiptOptions);
}

async function getUserWalletAuthorizationSignature(payload: Uint8Array): Promise<string> {
  if (!userWalletAuthorizationSignatureProvider) {
    throw new Error('User-wallet authorization is not ready');
  }

  return userWalletAuthorizationSignatureProvider(payload);
}

import type { WalletAccount } from '@comitium/auth/send-calls';
import { waitForOperationReceipt } from '@comitium/chain/onchain-operation-observer';
import type {
  OnchainOperationProductState,
  OnchainRequestSignatureRequest,
} from '@comitium/schemas/onchain-operations';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { submitOnchainOperationSignature } from '@/lib/api/onchain-operations';

import {
  submitAndConfirmPreparedRelayedOperation,
  submitPreparedRelayedOperation,
} from '../onchain-operation-signatures';

vi.mock('@/lib/api/onchain-operations', () => ({
  submitOnchainOperationSignature: vi.fn(),
}));

vi.mock('@comitium/chain/onchain-operation-observer', () => ({
  waitForOperationReceipt: vi.fn(),
}));

const ORG_ID = '11111111-1111-4111-8111-111111111111';
const OPERATION_ID = '22222222-2222-4222-8222-222222222222';
const REQUEST_ID = '33333333-3333-4333-8333-333333333333';
const SIGNATURE = `0x${'a'.repeat(130)}` as `0x${string}`;

const request = {
  requestId: REQUEST_ID,
  domain: {
    name: 'ComitiumForwarder',
    version: '1',
    chainId: 84_532,
    verifyingContract: '0x1111111111111111111111111111111111111111',
  },
  types: {
    ForwardRequest: [
      { name: 'from', type: 'address' },
      { name: 'to', type: 'address' },
    ],
  },
  primaryType: 'ForwardRequest',
  message: {
    from: '0x2222222222222222222222222222222222222222',
    to: '0x3333333333333333333333333333333333333333',
    value: '0',
    gas: '100000',
    nonce: '1',
    deadline: '2000000000',
    data: '0x1234',
  },
} satisfies OnchainRequestSignatureRequest;

const account = {
  signTypedData: vi.fn().mockResolvedValue(SIGNATURE),
} as unknown as WalletAccount;

function prepared(state: OnchainOperationProductState, signatureRequest: OnchainRequestSignatureRequest | null = null) {
  return {
    operationId: OPERATION_ID,
    state,
    signatureRequest,
  };
}

describe('relayed transaction acceptance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(submitOnchainOperationSignature).mockResolvedValue();
    vi.mocked(waitForOperationReceipt).mockResolvedValue({ kind: 'confirmed' });
  });

  it('signs the embedded prepare payload and submits its exact request id', async () => {
    await expect(
      submitPreparedRelayedOperation(ORG_ID, prepared('wallet_confirmation', request), account),
    ).resolves.toBeUndefined();

    expect(account.signTypedData).toHaveBeenCalledExactlyOnceWith({
      domain: request.domain,
      types: request.types,
      primaryType: request.primaryType,
      message: request.message,
    });
    expect(submitOnchainOperationSignature).toHaveBeenCalledExactlyOnceWith(ORG_ID, OPERATION_ID, {
      requestId: REQUEST_ID,
      signature: SIGNATURE,
    });
  });

  it.each(['confirming', 'completed'] as const)('does not sign an already accepted %s operation', async (state) => {
    await expect(submitPreparedRelayedOperation(ORG_ID, prepared(state), account)).resolves.toBeUndefined();

    expect(account.signTypedData).not.toHaveBeenCalled();
    expect(submitOnchainOperationSignature).not.toHaveBeenCalled();
  });

  it('rejects an inconsistent wallet-confirmation response without another API request', async () => {
    await expect(submitPreparedRelayedOperation(ORG_ID, prepared('wallet_confirmation'), account)).rejects.toThrow(
      'missing its signature request',
    );

    expect(account.signTypedData).not.toHaveBeenCalled();
    expect(submitOnchainOperationSignature).not.toHaveBeenCalled();
  });

  it('submits the signature before waiting on the shared operation observer', async () => {
    await expect(
      submitAndConfirmPreparedRelayedOperation(ORG_ID, prepared('wallet_confirmation', request), account),
    ).resolves.toMatchObject({ kind: 'confirmed' });

    expect(waitForOperationReceipt).toHaveBeenCalledExactlyOnceWith(OPERATION_ID);
    expect(vi.mocked(submitOnchainOperationSignature).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(waitForOperationReceipt).mock.invocationCallOrder[0],
    );
  });

  it('surfaces an operation that must be prepared again', async () => {
    await expect(submitPreparedRelayedOperation(ORG_ID, prepared('try_again'), account)).rejects.toThrow(
      'Please try again',
    );
  });
});

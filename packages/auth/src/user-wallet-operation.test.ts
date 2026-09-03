import { base64 } from '@scure/base';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  submitUserWalletTransaction: vi.fn(),
  waitForOperationReceipt: vi.fn(),
}));

vi.mock('@comitium/chain/onchain-operation-observer', () => ({
  waitForOperationReceipt: mocks.waitForOperationReceipt,
}));

const {
  registerUserWalletAuthorizationSignatureProvider,
  registerUserWalletOperationTransport,
  submitPreparedUserWalletOnchainOperation,
} = await import('./user-wallet-operation');

const OPERATION_ID = '11111111-2222-4333-8444-555555555555';
const REQUEST_ID = '99999999-8888-4777-8666-555555555555';
const AUTHORIZATION_PAYLOAD = base64.encode(new TextEncoder().encode('authorization-payload'));
const AUTHORIZATION_SIGNATURE = 'test-authorization-signature';

describe('user-wallet operation submission', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    registerUserWalletAuthorizationSignatureProvider(async () => AUTHORIZATION_SIGNATURE);
    registerUserWalletOperationTransport(mocks.submitUserWalletTransaction);
    mocks.submitUserWalletTransaction.mockResolvedValue(undefined);
    mocks.waitForOperationReceipt.mockResolvedValue({ kind: 'confirmed' });
  });

  it('signs and submits the prepared Privy request before waiting for authoritative confirmation', async () => {
    const result = await submitPreparedUserWalletOnchainOperation({
      operationId: OPERATION_ID,
      requestId: REQUEST_ID,
      authorizationPayload: AUTHORIZATION_PAYLOAD,
    });

    expect(result).toEqual({ kind: 'confirmed' });
    expect(mocks.submitUserWalletTransaction).toHaveBeenCalledExactlyOnceWith(OPERATION_ID, {
      requestId: REQUEST_ID,
      authorizationSignature: AUTHORIZATION_SIGNATURE,
    });
    expect(mocks.waitForOperationReceipt).toHaveBeenCalledExactlyOnceWith(OPERATION_ID, {});
  });

  it('uses canonical operation failure instead of browser-owned provider status', async () => {
    mocks.waitForOperationReceipt.mockRejectedValue(new Error('Transaction was not submitted'));

    await expect(
      submitPreparedUserWalletOnchainOperation({
        operationId: OPERATION_ID,
        requestId: REQUEST_ID,
        authorizationPayload: AUTHORIZATION_PAYLOAD,
      }),
    ).rejects.toThrow('Transaction was not submitted');
    expect(mocks.waitForOperationReceipt).toHaveBeenCalledExactlyOnceWith(OPERATION_ID, {});
  });
});

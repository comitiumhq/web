import { beforeEach, describe, expect, it, vi } from 'vitest';

import { api } from '../client';
import { getOnchainOperationStatus, submitUserWalletTransaction } from '../onchain-operations';

vi.mock('../client', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

const mockGet = vi.mocked(api.get);
const mockPost = vi.mocked(api.post);
const OPERATION_ID = '11111111-2222-4333-8444-555555555555';
const REQUEST_ID = '22222222-3333-4444-8555-666666666666';

describe('user-wallet on-chain API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('submits the operation-owned wallet transaction by its opaque identity', async () => {
    mockPost.mockResolvedValue(undefined);

    await submitUserWalletTransaction(OPERATION_ID, {
      requestId: REQUEST_ID,
      authorizationSignature: 'AQ==',
    });

    expect(mockPost).toHaveBeenCalledExactlyOnceWith(
      `/onchain-operations/${OPERATION_ID}/wallet-submit`,
      {
        requestId: REQUEST_ID,
        authorizationSignature: 'AQ==',
      },
      null,
    );
  });

  it('reads execution and product settlement from one operation resource', async () => {
    mockGet.mockResolvedValue({
      state: 'confirming',
      execution: { status: 'pending' },
    });

    await getOnchainOperationStatus(OPERATION_ID);

    expect(mockGet).toHaveBeenCalledExactlyOnceWith(`/onchain-operations/${OPERATION_ID}`, expect.anything());
  });
});

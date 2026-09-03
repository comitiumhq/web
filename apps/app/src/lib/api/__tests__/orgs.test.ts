import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../client';
import { prepareOrgContentUriUpdate } from '../orgs';

vi.mock('../client', () => ({
  api: {
    post: vi.fn(),
  },
}));

const mockPost = vi.mocked(api.post);

describe('prepareOrgContentUriUpdate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('stages the careers slug in the durable on-chain prepare request', async () => {
    mockPost.mockResolvedValue({
      operationId: '00000000-0000-0000-0000-000000000001',
      state: 'wallet_confirmation',
      signatureRequest: null,
    });
    const payload = {
      name: 'Example Company',
      careersSlug: 'example-company',
      description: 'Private hiring infrastructure',
      logo: null,
      website: 'https://example.com',
    };

    await prepareOrgContentUriUpdate('org-id', payload);

    expect(mockPost).toHaveBeenCalledExactlyOnceWith('/orgs/org-id/profile/prepare', payload, expect.anything());
  });
});

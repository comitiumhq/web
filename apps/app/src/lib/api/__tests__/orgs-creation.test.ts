import { beforeEach, describe, expect, it, vi } from 'vitest';

import { api } from '../client';
import { getOrgCreationStatus, prepareOrgCreation } from '../orgs-creation';

vi.mock('../client', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

const mockGet = vi.mocked(api.get);
const mockPost = vi.mocked(api.post);

describe('organization creation API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reads one actor-scoped product status without URL-carried operation identity', async () => {
    mockGet.mockResolvedValue({ status: 'needs_verification' });

    await getOrgCreationStatus();

    expect(mockGet).toHaveBeenCalledExactlyOnceWith('/orgs/creation', expect.anything());
  });

  it('prepares creation from the verified actor state without client domain or operation IDs', async () => {
    mockPost.mockResolvedValue({ state: 'confirming' });

    await prepareOrgCreation();

    expect(mockPost).toHaveBeenCalledExactlyOnceWith('/orgs/creation/prepare', undefined, expect.anything());
  });
});

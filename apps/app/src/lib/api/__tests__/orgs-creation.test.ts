import { beforeEach, describe, expect, it, vi } from 'vitest';

import { api } from '../client';
import { createOrg, getOrgCreationStatus } from '../orgs-creation';

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

  it('creates the organization from the verified actor state without client domain or operation IDs', async () => {
    mockPost.mockResolvedValue({
      state: 'completed',
      organizationId: '11111111-2222-4333-8444-555555555555',
    });

    await createOrg();

    expect(mockPost).toHaveBeenCalledExactlyOnceWith('/orgs/creation', undefined, expect.anything());
  });
});

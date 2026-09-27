import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../client';
import { deleteMemberAvatar, updateOrgProfile, uploadMemberAvatar } from '../orgs';

vi.mock('../client', () => ({
  api: {
    delete: vi.fn(),
    patch: vi.fn(),
    post: vi.fn(),
    upload: vi.fn(),
  },
}));

const mockDelete = vi.mocked(api.delete);
const mockPatch = vi.mocked(api.patch);
const mockUpload = vi.mocked(api.upload);

describe('updateOrgProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updates the product profile without exposing the registry operation', async () => {
    mockPatch.mockResolvedValue({
      state: 'completed',
      organizationId: '00000000-0000-0000-0000-000000000001',
    });
    const payload = {
      name: 'Example Company',
      careersSlug: 'example-company',
      description: 'Private hiring infrastructure',
      logo: null,
      website: 'https://example.com',
    };

    await updateOrgProfile('org-id', payload);

    expect(mockPatch).toHaveBeenCalledExactlyOnceWith('/orgs/org-id/profile', payload, expect.anything());
  });
});

describe('member avatar API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uploads the selected image as multipart form data', async () => {
    const file = new File(['image'], 'avatar.png', { type: 'image/png' });
    const crop = { x: 0.1, y: 0.2, width: 0.5, height: 0.5 };
    mockUpload.mockResolvedValue({ avatarUrl: '/orgs/org-id/members/user-id/avatar/version-id' });

    await uploadMemberAvatar('org-id', { file, crop });

    expect(mockUpload).toHaveBeenCalledExactlyOnceWith(
      '/orgs/org-id/member/avatar',
      expect.any(FormData),
      expect.anything(),
    );
    const formData = mockUpload.mock.calls[0]?.[1];
    expect(formData?.get('file')).toBe(file);
    expect(formData?.get('crop')).toBe(JSON.stringify(crop));
  });

  it('removes the current member avatar', async () => {
    mockDelete.mockResolvedValue({ success: true });

    await expect(deleteMemberAvatar('org-id')).resolves.toEqual({ avatarUrl: null });
    expect(mockDelete).toHaveBeenCalledExactlyOnceWith('/orgs/org-id/member/avatar', expect.anything());
  });
});

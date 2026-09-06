import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OrgMeResponse } from '@/lib/schemas/org';

const mocks = vi.hoisted(() => ({
  invalidateQueries: vi.fn(),
  mutationOptions: null as object | null,
  setQueryData: vi.fn(),
  toastSuccess: vi.fn(),
  useMutation: vi.fn((options: object) => {
    mocks.mutationOptions = options;

    return {};
  }),
}));

vi.mock('@tanstack/react-query', () => ({
  useMutation: mocks.useMutation,
  useQueryClient: () => ({
    invalidateQueries: mocks.invalidateQueries,
    setQueryData: mocks.setQueryData,
  }),
}));

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: mocks.toastSuccess,
  },
}));

vi.mock('@/lib/api/orgs', () => ({
  deleteMemberAvatar: vi.fn(),
  uploadMemberAvatar: vi.fn(),
}));

import { useUpdateMemberAvatar } from '../use-update-member-avatar';

const ORG_ID = '11111111-1111-4111-8111-111111111111';
const AVATAR_URL = `/orgs/${ORG_ID}/members/22222222-2222-4222-8222-222222222222/avatar/33333333-3333-4333-8333-333333333333`;

interface MemberAvatarMutationOptions {
  onSuccess: (result: { avatarUrl: string | null }) => void;
}

function getMutationOptions(): MemberAvatarMutationOptions {
  useUpdateMemberAvatar(ORG_ID);

  return mocks.mutationOptions as MemberAvatarMutationOptions;
}

describe('member avatar cache refresh', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mutationOptions = null;
  });

  it('updates the current profile immediately and invalidates every avatar-bearing read model', () => {
    const options = getMutationOptions();

    options.onSuccess({ avatarUrl: AVATAR_URL });

    expect(mocks.setQueryData).toHaveBeenCalledWith(['org-permissions', ORG_ID], expect.any(Function));
    const updateMe = mocks.setQueryData.mock.calls[0]?.[1] as (current: OrgMeResponse) => OrgMeResponse;
    expect(updateMe({ avatarUrl: null } as OrgMeResponse).avatarUrl).toBe(AVATAR_URL);
    expect(mocks.invalidateQueries.mock.calls.map(([request]) => request.queryKey)).toEqual([
      ['org', ORG_ID, 'team'],
      ['application'],
      ['feedback-submissions'],
      ['candidate-activity'],
      ['jobs'],
      ['job'],
      ['stage-activities'],
    ]);
    expect(mocks.toastSuccess).toHaveBeenCalledWith('Profile photo updated');
  });
});

import { flushSync } from 'react-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { TagSelector } from './tag-selector';

const mocks = vi.hoisted(() => ({
  assign: vi.fn(),
  assignAsync: vi.fn(),
  createTagAsync: vi.fn(),
  unassign: vi.fn(),
}));

const existingTag = {
  id: '11111111-1111-4111-8111-111111111111',
  label: 'Priority',
  labelHash: 'a'.repeat(64),
  isArchived: false,
  createdBy: '22222222-2222-4222-8222-222222222222',
  createdAt: '2026-09-12T10:00:00.000Z',
  updatedAt: '2026-09-12T10:00:00.000Z',
};

vi.mock('@/hooks/mutations/use-candidate-tag', () => ({
  useAssignTagToCandidate: () => ({
    mutate: mocks.assign,
    mutateAsync: mocks.assignAsync,
    isPending: false,
  }),
  useCreateCandidateTag: () => ({ mutateAsync: mocks.createTagAsync, isPending: false }),
  useUnassignTagFromCandidate: () => ({ mutate: mocks.unassign, isPending: false }),
}));

vi.mock('@/hooks/queries/use-query-org-vault-key', () => ({
  useQueryOrgVaultKey: () => ({
    data: {
      vaultPublicKey: { v: 1, xwing: 'public-key' },
      keyVersion: 1,
    },
  }),
}));

vi.mock('@/hooks/queries/use-query-wrapped-vault-key', () => ({
  useQueryWrappedVaultKey: () => ({ data: { v: 1, ciphertext: 'wrapped-key' } }),
}));

vi.mock('@/hooks/use-candidate-tags', () => ({
  useCandidateTags: () => ({
    tags: [existingTag],
    tagMap: new Map([[existingTag.id, existingTag]]),
    isLoading: false,
    error: null,
  }),
}));

vi.mock('@/hooks/use-permissions', () => ({
  usePermissions: () => ({ can: () => true }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.createTagAsync.mockResolvedValue({ data: { id: '33333333-3333-4333-8333-333333333333' } });
  mocks.assignAsync.mockResolvedValue(undefined);
});

describe('TagSelector', () => {
  it('requires confirmation before removing an assigned tag', async () => {
    const screen = await render(
      <TagSelector orgId="org-1" candidateId="candidate-1" tagIds={[existingTag.id]} canAssign maxVisibleTags={3} />,
    );

    await screen.getByRole('button', { name: 'Remove tag Priority' }).click();

    await expect.element(screen.getByRole('heading', { name: 'Remove this tag?' })).toBeVisible();
    expect(mocks.unassign).not.toHaveBeenCalled();

    await screen.getByRole('button', { name: 'Remove', exact: true }).click();

    expect(mocks.unassign).toHaveBeenCalledWith(
      { candidateId: 'candidate-1', tagId: existingTag.id, orgId: 'org-1' },
      expect.any(Object),
    );
  });

  it('keeps the options open until assigning an existing tag succeeds', async () => {
    const screen = await render(
      <TagSelector orgId="org-1" candidateId="candidate-1" tagIds={[]} canAssign maxVisibleTags={3} />,
    );

    await screen.getByRole('button', { name: 'Add tag' }).click();
    await screen.getByRole('option', { name: 'Priority' }).click();

    await expect.element(screen.getByRole('option', { name: 'Priority' })).toBeVisible();

    const onSuccess = mocks.assign.mock.calls[0]?.[1]?.onSuccess;

    expect(onSuccess).toBeTypeOf('function');

    flushSync(() => onSuccess());

    await expect.element(screen.getByRole('option', { name: 'Priority' })).not.toBeInTheDocument();
  });

  it('closes after a newly created tag is assigned', async () => {
    const screen = await render(
      <TagSelector orgId="org-1" candidateId="candidate-1" tagIds={[]} canAssign maxVisibleTags={3} />,
    );

    await screen.getByRole('button', { name: 'Add tag' }).click();
    await screen.getByPlaceholder('Search or create...').fill('New tag');
    await screen.getByRole('option', { name: 'Create tag: "New tag"' }).click();

    await expect.element(screen.getByRole('option', { name: 'Create tag: "New tag"' })).not.toBeInTheDocument();
    expect(mocks.createTagAsync).toHaveBeenCalledOnce();
    expect(mocks.assignAsync).toHaveBeenCalledOnce();
  });

  it('keeps a stable action trigger and clears search when the menu closes', async () => {
    const screen = await render(
      <TagSelector orgId="org-1" candidateId="candidate-1" tagIds={[]} canAssign maxVisibleTags={3} />,
    );

    const trigger = screen.getByRole('button', { name: 'Add tag' });

    await expect.element(trigger).toBeVisible();
    await expect.element(screen.getByRole('button', { name: 'Show add tag options' })).not.toBeInTheDocument();

    await trigger.click();
    await screen.getByPlaceholder('Search or create...').fill('Priority');
    await trigger.click();

    await expect.element(screen.getByPlaceholder('Search or create...')).not.toBeInTheDocument();
    await expect.element(trigger).toBeVisible();

    await trigger.click();

    await expect.element(screen.getByPlaceholder('Search or create...')).toHaveValue('');
  });
});

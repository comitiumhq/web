import type { JobLifecycle } from '@comitium/schemas/public-jobs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { DraftShellActions } from './draft-shell-actions';

const mocks = vi.hoisted(() => ({
  context: {
    orgId: 'org-1',
    jobId: 'job-1',
    draft: { title: 'Backend engineer' },
    isDirty: false,
    isSaving: false,
    save: vi.fn(),
    description: {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Build reliable systems.' }] }],
    },
    previewOpen: false,
    publishOpen: false,
    publishVersion: null,
    setPreviewOpen: vi.fn(),
    setPublishOpen: vi.fn(),
    handlePreviewClick: vi.fn(),
    handlePublishClick: vi.fn(),
  },
}));

vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => vi.fn(),
}));

vi.mock('@/hooks/mutations/use-create-draft', () => ({
  useCreateDraft: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock('@/hooks/mutations/use-delete-draft', () => ({
  useDeleteDraft: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock('@/hooks/use-job-permissions', () => ({
  useJobPermissions: () => ({ canOnJob: () => true }),
}));

vi.mock('@/hooks/use-permissions', () => ({
  usePermissions: () => ({ can: () => true }),
}));

vi.mock('./draft-form-context', () => ({
  useDraftFormContext: () => mocks.context,
}));

vi.mock('./draft-preview-dialog', () => ({
  DraftPreviewDialog: () => null,
}));

const lifecycle: JobLifecycle = {
  commitmentFinalizationPending: false,
  activeApplications: 0,
  allowedActions: ['publish_posting'],
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('DraftShellActions', () => {
  it('exposes Preview as a direct action', async () => {
    const screen = await render(<DraftShellActions lifecycle={lifecycle} />);

    await screen.getByRole('button', { name: 'Preview' }).click();

    expect(mocks.context.handlePreviewClick).toHaveBeenCalledOnce();
  });

  it('exposes Publish as a direct action', async () => {
    const screen = await render(<DraftShellActions lifecycle={lifecycle} />);

    await screen.getByRole('button', { name: 'Publish' }).click();

    expect(mocks.context.handlePublishClick).toHaveBeenCalledOnce();
  });
});

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
    descriptionMarkdown: 'Build reliable systems.',
    previewOpen: false,
    publishOpen: true,
    publishVersion: 3,
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

vi.mock('./publish-job-dialog', () => ({
  PublishJobDialog: () => <div>Committed Publish dialog</div>,
}));

vi.mock('@/components/features/job-posting/publish-job-dialog-v2', () => ({
  PublishJobDialogV2: () => <div>Standard Publish dialog</div>,
}));

const lifecycle: JobLifecycle = {
  transition: null,
  commitmentFinalizationPending: false,
  activeApplications: 0,
  allowedActions: ['publish_job'],
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('DraftShellActions', () => {
  it('exposes Preview as a direct action', async () => {
    const screen = await render(<DraftShellActions lifecycle={lifecycle} postingApplyMode="standard" />);

    await screen.getByRole('button', { name: 'Preview' }).click();

    expect(mocks.context.handlePreviewClick).toHaveBeenCalledOnce();
  });

  it('opens the standard Publish flow for a standard Posting', async () => {
    const screen = await render(<DraftShellActions lifecycle={lifecycle} postingApplyMode="standard" />);

    await expect.element(screen.getByText('Standard Publish dialog')).toBeInTheDocument();
    await expect.element(screen.getByText('Committed Publish dialog')).not.toBeInTheDocument();
  });

  it('preserves the committed Publish flow for a committed Posting', async () => {
    const screen = await render(<DraftShellActions lifecycle={lifecycle} postingApplyMode="committed" />);

    await expect.element(screen.getByText('Committed Publish dialog')).toBeInTheDocument();
    await expect.element(screen.getByText('Standard Publish dialog')).not.toBeInTheDocument();
  });
});

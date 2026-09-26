import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { DraftPostingActions } from './draft-posting-actions';

const mocks = vi.hoisted(() => ({
  context: {
    orgId: 'org-1',
    draft: { title: 'Backend engineer' },
    description: null,
    isDirty: false,
    isSaving: false,
    previewOpen: false,
    setPreviewOpen: vi.fn(),
    handlePreviewClick: vi.fn(),
    validatePublish: vi.fn(() => true),
  },
  publish: vi.fn(),
}));

vi.mock('@/components/features/job-draft/draft-form-context', () => ({
  useDraftFormContext: () => mocks.context,
}));

vi.mock('@/components/features/job-draft/draft-preview-dialog', () => ({
  DraftPreviewDialog: () => null,
}));

vi.mock('@/hooks/queries/use-query-job-summary', () => ({
  useQueryJobSummary: () => ({
    data: {
      lifecycle: {
        commitmentFinalizationPending: false,
        activeApplications: 0,
        allowedActions: ['open_job', 'publish_posting'],
      },
    },
  }),
}));

vi.mock('@/hooks/queries/use-query-job-posting', () => ({
  useQueryJobPosting: () => ({
    data: { form: { isArchived: false }, version: 4 },
    isFetching: false,
  }),
}));

vi.mock('@/hooks/mutations/use-job-posting-mutations', () => ({
  usePublishJobPosting: () => ({ isPending: false, mutate: mocks.publish }),
}));

vi.mock('@/hooks/use-job-permissions', () => ({
  useJobPermissions: () => ({ canOnJob: () => true }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.context.validatePublish.mockReturnValue(true);
});

describe('DraftPostingActions', () => {
  it('offers preview and publish from the Posting section', async () => {
    const screen = await render(<DraftPostingActions jobId="job-1" />);

    await screen.getByRole('button', { name: 'Preview' }).click();
    await screen.getByRole('button', { name: 'Publish' }).click();

    expect(mocks.context.handlePreviewClick).toHaveBeenCalledOnce();
    expect(mocks.context.validatePublish).toHaveBeenCalledExactlyOnceWith(false);
    expect(mocks.publish).toHaveBeenCalledExactlyOnceWith({ expectedVersion: 4 });
  });

  it('does not publish when required fields are missing', async () => {
    mocks.context.validatePublish.mockReturnValue(false);
    const screen = await render(<DraftPostingActions jobId="job-1" />);

    await screen.getByRole('button', { name: 'Publish' }).click();

    expect(mocks.publish).not.toHaveBeenCalled();
  });
});

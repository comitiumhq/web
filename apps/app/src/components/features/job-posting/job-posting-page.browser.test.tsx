import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { JobPostingPage } from './job-posting-page';

const mocks = vi.hoisted(() => ({
  job: {
    canonicalUrl: 'https://jobs.example.test/backend-engineer',
    status: 'open' as 'open' | 'closed',
    title: 'Backend Engineer',
  },
  posting: {
    id: 'posting-1',
    status: 'unpublished' as 'published' | 'unpublished',
    descriptionMarkdown: 'Build reliable systems.',
    form: { id: 'form-1', title: 'Default Application Form', isArchived: false },
    applicationCapacity: 25 as number | null,
    completedApplicationCount: 4,
    version: 7,
  },
  unpublish: vi.fn(),
  update: vi.fn(),
  updateAsync: vi.fn(),
}));

vi.mock('@/components/features/job-detail/job-description-editor-dialog', () => ({
  JobDescriptionEditorDialog: () => null,
}));

vi.mock('@/hooks/mutations/use-job-posting-mutations', () => ({
  useUnpublishJobPosting: () => ({ isPending: false, mutate: mocks.unpublish }),
  useUpdateJobPosting: () => ({ isPending: false, mutate: mocks.update, mutateAsync: mocks.updateAsync }),
}));

vi.mock('@/hooks/queries/use-query-job-posting', () => ({
  useQueryJobPosting: () => ({ data: mocks.posting, isError: false, isLoading: false }),
}));

vi.mock('@/hooks/queries/use-query-job-summary', () => ({
  useQueryJobSummary: () => ({
    data: mocks.job,
    isError: false,
    isLoading: false,
  }),
}));

vi.mock('@/hooks/use-job-permissions', () => ({
  useJobPermissions: () => ({ canOnJob: () => true, isLoading: false }),
}));

vi.mock('./application-form-dialog', () => ({
  ApplicationFormDialog: () => null,
}));

vi.mock('./publish-job-dialog-v2', () => ({
  PublishJobDialogV2: ({ jobTitle, open }: { jobTitle: string; open: boolean }) =>
    open ? (
      <div role="dialog">
        <h2>Publish &ldquo;{jobTitle}&rdquo;?</h2>
      </div>
    ) : null,
}));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.job = {
    canonicalUrl: 'https://jobs.example.test/backend-engineer',
    status: 'open',
    title: 'Backend Engineer',
  };
  mocks.posting = {
    id: 'posting-1',
    status: 'unpublished',
    descriptionMarkdown: 'Build reliable systems.',
    form: { id: 'form-1', title: 'Default Application Form', isArchived: false },
    applicationCapacity: 25,
    completedApplicationCount: 4,
    version: 7,
  };
});

describe('JobPostingPage', () => {
  it('opens the Publish dialog for an unpublished Open Job', async () => {
    const screen = await render(<JobPostingPage orgId="org-1" jobId="job-1" />);

    await expect.element(screen.getByRole('button', { name: 'Publish' })).toBeEnabled();
    await screen.getByRole('button', { name: 'Publish' }).click();

    await expect
      .element(screen.getByRole('dialog').getByRole('heading', { name: 'Publish “Backend Engineer”?' }))
      .toBeInTheDocument();
  });

  it('requires confirmation before unpublishing', async () => {
    mocks.posting = { ...mocks.posting, status: 'published' };
    const screen = await render(<JobPostingPage orgId="org-1" jobId="job-1" />);

    await screen.getByRole('button', { name: 'Unpublish' }).click();

    const dialog = screen.getByRole('dialog');
    await expect.element(dialog.getByRole('heading', { name: 'Unpublish this Posting?' })).toBeInTheDocument();
    await dialog.getByRole('button', { name: 'Unpublish' }).click();

    expect(mocks.unpublish).toHaveBeenCalledExactlyOnceWith(
      7,
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });

  it('renders a Closed Job Posting as read-only', async () => {
    mocks.job = { ...mocks.job, status: 'closed' };
    const screen = await render(<JobPostingPage orgId="org-1" jobId="job-1" />);

    await expect.element(screen.getByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
    await expect.element(screen.getByRole('button', { name: 'Save' })).not.toBeInTheDocument();
    await expect.element(screen.getByLabelText('Maximum applications')).toBeDisabled();
    await expect.element(screen.getByRole('button', { name: 'Publish' })).toBeDisabled();
  });
});

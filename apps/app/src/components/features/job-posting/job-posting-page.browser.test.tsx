import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { JobPostingPage } from './job-posting-page';

const mocks = vi.hoisted(() => ({
  job: {
    canonicalUrl: 'https://jobs.example.test/backend-engineer',
    lifecycle: { commitmentFinalizationPending: false },
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
    commitment: null as null | {
      status: 'published' | 'unpublished' | 'closed' | 'expired';
      responseDeadlineDays: number;
      pendingApplicationResponses: number;
      canSettle: boolean;
    },
    version: 7,
  },
  release: vi.fn(),
  unpublish: vi.fn(),
  update: vi.fn(),
  updateAsync: vi.fn(),
}));

vi.mock('@/components/features/job-detail/job-description-editor-dialog', () => ({
  JobDescriptionEditorDialog: () => null,
}));

vi.mock('@/hooks/mutations/use-job-posting-mutations', () => ({
  useReleaseCommitmentFunds: () => ({
    isPending: false,
    isConfirming: false,
    mutate: mocks.release,
  }),
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

vi.mock('./response-commitment-dialog', () => ({
  ResponseCommitmentDialog: ({ open }: { open: boolean }) =>
    open ? <div role="dialog">Add response commitment</div> : null,
}));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.job = {
    canonicalUrl: 'https://jobs.example.test/backend-engineer',
    lifecycle: { commitmentFinalizationPending: false },
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
    commitment: null,
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

  it('adds a response commitment after a Posting is published', async () => {
    mocks.posting = { ...mocks.posting, status: 'published' };
    const screen = await render(<JobPostingPage orgId="org-1" jobId="job-1" />);

    await screen.getByRole('button', { name: 'Add response commitment' }).click();

    await expect.element(screen.getByRole('dialog', { name: '' })).toHaveTextContent('Add response commitment');
  });

  it('shows an active response commitment without another add action', async () => {
    mocks.posting = {
      ...mocks.posting,
      status: 'published',
      commitment: {
        status: 'published',
        responseDeadlineDays: 7,
        pendingApplicationResponses: 0,
        canSettle: false,
      },
    };
    const screen = await render(<JobPostingPage orgId="org-1" jobId="job-1" />);

    await expect.element(screen.getByText('Published · Response within 7 days')).toBeInTheDocument();
    await expect.element(screen.getByRole('button', { name: 'Add response commitment' })).not.toBeInTheDocument();
  });

  it('allows a completed active response commitment to settle without unpublishing the Posting', async () => {
    mocks.posting = {
      ...mocks.posting,
      status: 'published',
      commitment: {
        status: 'published',
        responseDeadlineDays: 7,
        pendingApplicationResponses: 0,
        canSettle: true,
      },
    };
    const screen = await render(<JobPostingPage orgId="org-1" jobId="job-1" />);

    await expect.element(screen.getByRole('button', { name: 'Release funds' })).toBeEnabled();
    await screen.getByRole('button', { name: 'Release funds' }).click();

    expect(mocks.release).toHaveBeenCalledOnce();
    expect(mocks.unpublish).not.toHaveBeenCalled();
  });

  it('allows another response commitment after the previous one is finalized', async () => {
    mocks.posting = {
      ...mocks.posting,
      status: 'published',
      commitment: {
        status: 'closed',
        responseDeadlineDays: 7,
        pendingApplicationResponses: 0,
        canSettle: false,
      },
    };
    const screen = await render(<JobPostingPage orgId="org-1" jobId="job-1" />);

    await expect.element(screen.getByRole('button', { name: 'Add response commitment' })).toBeEnabled();
  });

  it('waits for Commitment finalization before allowing another one', async () => {
    mocks.job = { ...mocks.job, lifecycle: { commitmentFinalizationPending: true } };
    mocks.posting = {
      ...mocks.posting,
      status: 'published',
      commitment: {
        status: 'closed',
        responseDeadlineDays: 7,
        pendingApplicationResponses: 0,
        canSettle: false,
      },
    };
    const screen = await render(<JobPostingPage orgId="org-1" jobId="job-1" />);

    await expect.element(screen.getByRole('button', { name: 'Add response commitment' })).not.toBeInTheDocument();
  });

  it('resolves a relative canonical URL against the public site origin', async () => {
    mocks.job = { ...mocks.job, canonicalUrl: '/careers/acme/jobs/backend-engineer' };
    mocks.posting = { ...mocks.posting, status: 'published' };
    const screen = await render(<JobPostingPage orgId="org-1" jobId="job-1" />);

    await expect
      .element(screen.getByRole('link', { name: 'View posting' }))
      .toHaveAttribute('href', 'http://localhost:3000/careers/acme/jobs/backend-engineer');
  });

  it('renders a Closed Job Posting as read-only', async () => {
    mocks.job = { ...mocks.job, status: 'closed' };
    const screen = await render(<JobPostingPage orgId="org-1" jobId="job-1" />);

    await expect.element(screen.getByRole('button', { name: 'Edit description' })).not.toBeInTheDocument();

    await screen.getByRole('tab', { name: 'Application form' }).click();
    await expect.element(screen.getByRole('button', { name: 'Change form' })).not.toBeInTheDocument();

    await screen.getByRole('tab', { name: 'Capacity' }).click();
    await expect.element(screen.getByRole('button', { name: 'Save capacity' })).not.toBeInTheDocument();
    await expect.element(screen.getByLabelText('Maximum applications')).toBeDisabled();
    await expect.element(screen.getByRole('button', { name: 'Publish' })).toBeDisabled();
  });

  it('shows the capacity save action only after the value changes', async () => {
    mocks.posting = { ...mocks.posting, status: 'published' };
    const screen = await render(<JobPostingPage orgId="org-1" jobId="job-1" />);

    await screen.getByRole('tab', { name: 'Capacity' }).click();
    await expect.element(screen.getByRole('button', { name: 'Save capacity' })).not.toBeInTheDocument();
    await screen.getByLabelText('Maximum applications').fill('30');

    await expect.element(screen.getByRole('button', { name: 'Save capacity' })).toBeEnabled();
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { JobPostingPage } from './job-posting-page';

const UPDATED_DESCRIPTION = {
  type: 'doc' as const,
  content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Updated description.' }] }],
};

const mocks = vi.hoisted(() => ({
  job: {
    canonicalUrl: 'https://jobs.example.test/backend-engineer',
    lifecycle: {
      commitmentFinalizationPending: false,
      activeApplications: 0,
      allowedActions: ['close_job', 'activate_commitment'],
    },
    status: 'open' as 'open' | 'closed',
    title: 'Backend Engineer',
  },
  posting: {
    id: 'posting-1',
    status: 'unpublished' as 'published' | 'unpublished',
    description: {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Build reliable systems.' }] }],
    },
    form: { id: 'form-1', title: 'Default Application Form', isArchived: false },
    applicationCapacity: 25 as number | null,
    completedApplicationCount: 4,
    commitment: null as null | {
      status: 'active' | 'stopped' | 'settled';
      responseDeadlineDays: number;
      pendingApplicationResponses: number;
      canSettle: boolean;
    },
    version: 7,
  },
  release: vi.fn(),
  publish: vi.fn(),
  unpublish: vi.fn(),
  update: vi.fn(),
  updateAsync: vi.fn(),
}));

vi.mock('./posting-description-editor', () => ({
  PostingDescriptionEditor: ({
    onChange,
    readOnly,
  }: {
    onChange?: (description: typeof UPDATED_DESCRIPTION) => void;
    readOnly?: boolean;
  }) => (
    <div data-testid="description-editor" data-read-only={readOnly ? 'true' : 'false'}>
      {onChange && (
        <button type="button" onClick={() => onChange(UPDATED_DESCRIPTION)}>
          Update description
        </button>
      )}
    </div>
  ),
}));

vi.mock('@/hooks/mutations/use-job-posting-mutations', () => ({
  usePublishJobPosting: () => ({ isPending: false, mutate: mocks.publish }),
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

vi.mock('./response-commitment-dialog', () => ({
  ResponseCommitmentDialog: ({ open }: { open: boolean }) =>
    open ? <div role="dialog">Add response commitment</div> : null,
}));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.job = {
    canonicalUrl: 'https://jobs.example.test/backend-engineer',
    lifecycle: {
      commitmentFinalizationPending: false,
      activeApplications: 0,
      allowedActions: ['close_job', 'activate_commitment'],
    },
    status: 'open',
    title: 'Backend Engineer',
  };
  mocks.posting = {
    id: 'posting-1',
    status: 'unpublished',
    description: {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Build reliable systems.' }] }],
    },
    form: { id: 'form-1', title: 'Default Application Form', isArchived: false },
    applicationCapacity: 25,
    completedApplicationCount: 4,
    commitment: null,
    version: 7,
  };
});

describe('JobPostingPage', () => {
  it('edits and saves the description inline', async () => {
    const screen = await render(<JobPostingPage orgId="org-1" jobId="job-1" />);

    await expect.element(screen.getByTestId('description-editor')).toHaveAttribute('data-read-only', 'false');
    await expect.element(screen.getByText('Ready for candidates')).not.toBeInTheDocument();
    await expect.element(screen.getByRole('button', { name: 'Edit description' })).not.toBeInTheDocument();

    await screen.getByRole('button', { name: 'Update description' }).click();
    await screen.getByRole('button', { name: 'Save changes' }).click();

    expect(mocks.updateAsync).toHaveBeenCalledExactlyOnceWith({
      expectedVersion: 7,
      description: UPDATED_DESCRIPTION,
    });
  });

  it('publishes an unpublished Posting directly', async () => {
    const screen = await render(<JobPostingPage orgId="org-1" jobId="job-1" />);

    await expect.element(screen.getByRole('button', { name: 'Publish' })).toBeEnabled();
    await screen.getByRole('button', { name: 'Publish' }).click();

    expect(mocks.publish).toHaveBeenCalledExactlyOnceWith({ expectedVersion: 7 });
  });

  it('shows the invalid Posting section instead of publishing', async () => {
    mocks.posting = {
      ...mocks.posting,
      form: { ...mocks.posting.form, isArchived: true },
    };
    const screen = await render(<JobPostingPage orgId="org-1" jobId="job-1" />);

    await screen.getByRole('button', { name: 'Publish' }).click();

    await expect.element(screen.getByText('Complete required fields:')).toBeInTheDocument();
    await expect.element(screen.getByRole('button', { name: 'Application form' })).toBeInTheDocument();
    expect(mocks.publish).not.toHaveBeenCalled();
  });

  it('requires confirmation before unpublishing', async () => {
    mocks.posting = { ...mocks.posting, status: 'published' };
    const screen = await render(<JobPostingPage orgId="org-1" jobId="job-1" />);

    await screen.getByRole('button', { name: 'Posting actions' }).click();
    await screen.getByRole('menuitem', { name: 'Unpublish' }).click();

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

    await screen.getByRole('button', { name: 'Posting actions' }).click();
    await screen.getByRole('menuitem', { name: 'Add commitment' }).click();

    await expect.element(screen.getByRole('dialog', { name: '' })).toHaveTextContent('Add response commitment');
  });

  it('does not offer another response commitment while a lifecycle operation is pending', async () => {
    mocks.job = { ...mocks.job, lifecycle: { ...mocks.job.lifecycle, allowedActions: [] } };
    mocks.posting = { ...mocks.posting, status: 'published' };
    const screen = await render(<JobPostingPage orgId="org-1" jobId="job-1" />);

    await screen.getByRole('button', { name: 'Posting actions' }).click();
    await expect.element(screen.getByRole('menuitem', { name: 'Add commitment' })).not.toBeInTheDocument();
  });

  it('shows an active response commitment without another add action', async () => {
    mocks.job = { ...mocks.job, lifecycle: { ...mocks.job.lifecycle, allowedActions: [] } };
    mocks.posting = {
      ...mocks.posting,
      status: 'published',
      commitment: {
        status: 'active',
        responseDeadlineDays: 7,
        pendingApplicationResponses: 0,
        canSettle: false,
      },
    };
    const screen = await render(<JobPostingPage orgId="org-1" jobId="job-1" />);

    await expect.element(screen.getByText('Published')).toBeInTheDocument();
    await screen.getByRole('button', { name: 'Posting actions' }).click();
    await expect.element(screen.getByRole('menuitem', { name: 'Add commitment' })).not.toBeInTheDocument();
  });

  it('allows a completed active response commitment to settle without unpublishing the Posting', async () => {
    mocks.job = { ...mocks.job, lifecycle: { ...mocks.job.lifecycle, allowedActions: ['settle_commitment'] } };
    mocks.posting = {
      ...mocks.posting,
      status: 'published',
      commitment: {
        status: 'active',
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
        status: 'settled',
        responseDeadlineDays: 7,
        pendingApplicationResponses: 0,
        canSettle: false,
      },
    };
    const screen = await render(<JobPostingPage orgId="org-1" jobId="job-1" />);

    await screen.getByRole('button', { name: 'Posting actions' }).click();
    await expect.element(screen.getByRole('menuitem', { name: 'Add commitment' })).toBeEnabled();
  });

  it('waits for Commitment finalization before allowing another one', async () => {
    mocks.job = {
      ...mocks.job,
      lifecycle: { ...mocks.job.lifecycle, commitmentFinalizationPending: true, allowedActions: [] },
    };
    mocks.posting = {
      ...mocks.posting,
      status: 'published',
      commitment: {
        status: 'settled',
        responseDeadlineDays: 7,
        pendingApplicationResponses: 0,
        canSettle: false,
      },
    };
    const screen = await render(<JobPostingPage orgId="org-1" jobId="job-1" />);

    await screen.getByRole('button', { name: 'Posting actions' }).click();
    await expect.element(screen.getByRole('menuitem', { name: 'Add commitment' })).not.toBeInTheDocument();
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

    await expect.element(screen.getByTestId('description-editor')).toHaveAttribute('data-read-only', 'true');

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

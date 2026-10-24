import { TooltipProvider } from '@comitium/ui/tooltip';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { JobPostingPage } from './job-posting-page';

const UPDATED_DESCRIPTION = {
  type: 'doc' as const,
  content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Updated description.' }] }],
};

const mocks = vi.hoisted(() => ({
  job: {
    canonicalUrl: 'https://jobs.example.test/careers/acme/jobs/backend-engineer',
    lifecycle: {
      activeApplications: 0,
      allowedActions: ['close_job', 'publish_posting'],
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
    skills: [],
    applicationCapacity: 25 as number | null,
    completedApplicationCount: 4,
    version: 7,
  },
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

vi.mock('@/config/site', () => ({
  getMyOrigin: () => 'https://my.example.test',
}));

vi.mock('../editor-autosave/autosave-navigation-guard', () => ({ AutosaveNavigationGuard: () => null }));

vi.mock('../job-draft/application-form-picker', () => ({
  ApplicationFormPicker: ({ onChange }: { onChange: (formId: string | null) => void }) => (
    <button type="button" onClick={() => onChange('form-2')}>
      Select another form
    </button>
  ),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.updateAsync.mockResolvedValue({ version: 8 });
  mocks.job = {
    canonicalUrl: 'https://jobs.example.test/careers/acme/jobs/backend-engineer',
    lifecycle: {
      activeApplications: 0,
      allowedActions: ['close_job', 'publish_posting'],
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
    skills: [],
    applicationCapacity: 25,
    completedApplicationCount: 4,
    version: 7,
  };
});

describe('JobPostingPage', () => {
  it('keeps form selection in its existing dialog and saves the choice immediately', async () => {
    const screen = await render(<JobPostingPage orgId="org-1" jobId="job-1" />);

    await screen.getByRole('tab', { name: 'Application form' }).click();

    await expect.element(screen.getByText('Default Application Form', { exact: true })).toBeVisible();
    await expect.element(screen.getByRole('button', { name: 'Select another form' })).not.toBeInTheDocument();

    await screen.getByRole('button', { name: 'Change form' }).click();

    const dialog = screen.getByRole('dialog');

    await expect.element(dialog.getByRole('heading', { name: 'Choose Application Form' })).toBeVisible();
    await expect.element(dialog.getByRole('button', { name: 'Save', exact: true })).not.toBeInTheDocument();

    await dialog.getByRole('button', { name: 'Select another form' }).click();

    await expect
      .poll(() => mocks.updateAsync.mock.calls)
      .toEqual([[{ expectedVersion: 7, formId: 'form-2', skills: undefined }]]);
    await expect.element(screen.getByRole('dialog')).not.toBeInTheDocument();
  });

  it('autosaves the description without a save button', async () => {
    const screen = await render(<JobPostingPage orgId="org-1" jobId="job-1" />);

    await expect.element(screen.getByTestId('description-editor')).toHaveAttribute('data-read-only', 'false');

    await expect.element(screen.getByRole('tab', { name: 'Skills' })).not.toBeInTheDocument();

    await expect.element(screen.getByRole('button', { name: 'Edit description' })).not.toBeInTheDocument();

    await screen.getByRole('button', { name: 'Update description' }).click();

    await expect
      .poll(() => mocks.updateAsync.mock.calls)
      .toEqual([
        [
          {
            expectedVersion: 7,
            description: UPDATED_DESCRIPTION,
            skills: undefined,
          },
        ],
      ]);
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

  it('opens the canonical Posting path in the candidate app', async () => {
    mocks.posting = { ...mocks.posting, status: 'published' };

    const screen = await render(<JobPostingPage orgId="org-1" jobId="job-1" />);

    await expect
      .element(screen.getByRole('link', { name: 'View posting' }))
      .toHaveAttribute('href', 'https://my.example.test/careers/acme/jobs/backend-engineer');
  });

  it('renders a Closed Job Posting as read-only', async () => {
    mocks.job = { ...mocks.job, status: 'closed' };

    const screen = await render(<JobPostingPage orgId="org-1" jobId="job-1" />);

    await expect.element(screen.getByTestId('description-editor')).toHaveAttribute('data-read-only', 'true');

    await screen.getByRole('tab', { name: 'Application form' }).click();

    await expect.element(screen.getByRole('button', { name: 'Change form' })).not.toBeInTheDocument();

    await screen.getByRole('tab', { name: 'Capacity' }).click();

    await expect.element(screen.getByRole('button', { name: 'Save changes' })).not.toBeInTheDocument();

    await expect.element(screen.getByLabelText('Maximum applications')).toBeDisabled();

    await expect.element(screen.getByRole('button', { name: 'Publish' })).toBeDisabled();
  });

  it('autosaves capacity and keeps the input editable', async () => {
    mocks.posting = { ...mocks.posting, status: 'published' };

    const screen = await render(<JobPostingPage orgId="org-1" jobId="job-1" />);

    await screen.getByRole('tab', { name: 'Capacity' }).click();

    await screen.getByLabelText('Maximum applications').fill('30');

    await expect
      .poll(() => mocks.updateAsync.mock.calls)
      .toEqual([[{ expectedVersion: 7, applicationCapacity: 30, skills: undefined }]]);

    await expect.element(screen.getByLabelText('Maximum applications')).toBeEnabled();

    await expect.element(screen.getByRole('button', { name: 'Save changes' })).not.toBeInTheDocument();
  });

  it('explains invalid capacity in the warning tooltip and clears it after correction', async () => {
    const screen = await render(
      <TooltipProvider>
        <JobPostingPage orgId="org-1" jobId="job-1" />
      </TooltipProvider>,
    );

    await screen.getByRole('tab', { name: 'Capacity' }).click();
    await screen.getByLabelText('Maximum applications').fill('1001');
    await screen.getByRole('button', { name: 'Unsaved changes' }).hover();
    await expect
      .element(screen.getByRole('tooltip'))
      .toHaveTextContent('Capacity must be a whole number between 1 and 1,000');

    expect(mocks.updateAsync).not.toHaveBeenCalled();

    await screen.getByLabelText('Maximum applications').fill('30');
    await expect.element(screen.getByRole('button', { name: 'Unsaved changes' })).not.toBeInTheDocument();
    await expect.element(screen.getByRole('tooltip')).not.toBeInTheDocument();
    await expect
      .poll(() => mocks.updateAsync.mock.calls)
      .toEqual([[{ expectedVersion: 7, applicationCapacity: 30, skills: undefined }]]);
  });
});

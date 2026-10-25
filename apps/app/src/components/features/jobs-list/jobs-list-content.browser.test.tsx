import type { JobDraftListItem, OrgJobListItem } from '@comitium/schemas/jobs';
import { TooltipProvider } from '@comitium/ui/tooltip';
import type { ReactNode } from 'react';
import { beforeEach, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import type { JobsRow } from './jobs-columns';
import { JobsListContent } from './jobs-list-content';

const mocks = vi.hoisted(() => ({
  creationContext: undefined as
    | { orgWide: boolean; departmentIds: string[]; setupAllowsJobCreation: boolean }
    | undefined,
  isCreationContextFetching: false,
  jobs: [] as OrgJobListItem[],
  drafts: [] as JobDraftListItem[],
}));

vi.mock('@/hooks/queries/use-query-job-creation-context', () => ({
  useQueryJobCreationContext: () => ({
    data: mocks.creationContext,
    isFetching: mocks.isCreationContextFetching,
  }),
}));

vi.mock('@/hooks/queries/use-query-jobs-with-drafts', () => ({
  useJobsWithDrafts: () => ({ jobs: mocks.jobs, drafts: mocks.drafts, isLoading: false }),
}));

vi.mock('@/hooks/queries/use-query-org-structure', () => ({
  useQueryOrgDepartments: () => ({ data: { data: [] } }),
  useQueryOrgLocations: () => ({ data: { data: [] } }),
}));

vi.mock('@/hooks/use-debounce', () => ({ useDebounce: (value: string) => value }));
vi.mock('@/hooks/use-permissions', () => ({ usePermissions: () => ({ isAdmin: true }) }));

vi.mock('./create-job-dialog', () => ({
  CreateJobDialog: ({ open }: { open: boolean }) => (open ? <div>New job dialog open</div> : null),
}));

vi.mock('./jobs-table', () => ({
  JobsTable: ({ rows, emptyState }: { rows: JobsRow[]; emptyState: ReactNode }) => (
    <div className="flex min-h-0 flex-1 flex-col justify-center" data-testid="job-rows">
      {rows.length === 0
        ? emptyState
        : rows.map((row) => (
            <button key={`${row.kind}-${row.id}`} type="button" data-row-kind={row.kind}>
              {row.kind === 'draft' ? row.draft.title : row.job.title}
            </button>
          ))}
    </div>
  ),
}));

const draft: JobDraftListItem = {
  id: 'draft-job',
  title: 'Draft role',
  status: 'draft',
  lifecycle: { activeApplications: 0, allowedActions: [] },
  departmentId: null,
  departmentName: null,
  locationId: null,
  locationName: null,
  location: null,
  category: null,
  employmentType: null,
  interviewPlanId: null,
  interviewPlanName: null,
  postingStatus: 'unpublished',
  createdAt: '2026-10-25T00:00:00.000Z',
  updatedAt: '2026-10-25T00:00:00.000Z',
  candidateCount: 0,
  hiringTeam: { members: [], total: 0 },
};

beforeEach(() => {
  mocks.creationContext = { orgWide: true, departmentIds: [], setupAllowsJobCreation: true };
  mocks.isCreationContextFetching = false;
  mocks.jobs = [];
  mocks.drafts = [];
});

it('renders one draft row when the same job is returned by both list endpoints', async () => {
  mocks.jobs = [{ ...draft, archivedAt: null }];
  mocks.drafts = [draft];
  const screen = await render(
    <TooltipProvider>
      <JobsListContent orgId="org-1" filters={{ status: 'all' }} onFiltersChange={vi.fn()} />
    </TooltipProvider>,
  );

  expect(screen.getByTestId('job-rows').element().querySelectorAll('button')).toHaveLength(1);
  await expect.element(screen.getByRole('button', { name: 'Draft role' })).toHaveAttribute('data-row-kind', 'draft');
  await expect.element(screen.getByRole('tab', { name: 'All 1' })).toBeInTheDocument();
});

it('keeps a same-route onboarding request while stale creation context refreshes', async () => {
  mocks.creationContext = { orgWide: true, departmentIds: [], setupAllowsJobCreation: false };
  mocks.isCreationContextFetching = true;
  const screen = await render(
    <TooltipProvider>
      <JobsListContent orgId="org-1" filters={{ status: 'all' }} onFiltersChange={vi.fn()} />
    </TooltipProvider>,
  );

  await expect.element(screen.getByText('New job dialog open')).not.toBeInTheDocument();
  await screen.rerender(
    <TooltipProvider>
      <JobsListContent orgId="org-1" filters={{ status: 'all' }} onFiltersChange={vi.fn()} createDialogRequested />
    </TooltipProvider>,
  );
  await expect.element(screen.getByText('New job dialog open')).not.toBeInTheDocument();

  mocks.creationContext = { orgWide: true, departmentIds: [], setupAllowsJobCreation: true };
  mocks.isCreationContextFetching = false;
  await screen.rerender(
    <TooltipProvider>
      <JobsListContent orgId="org-1" filters={{ status: 'all' }} onFiltersChange={vi.fn()} />
    </TooltipProvider>,
  );
  await expect.element(screen.getByText('New job dialog open')).toBeInTheDocument();
});

it('keeps every Jobs create entry disabled until the preceding setup steps are complete', async () => {
  mocks.creationContext = { orgWide: true, departmentIds: [], setupAllowsJobCreation: false };
  const screen = await render(
    <TooltipProvider>
      <JobsListContent orgId="org-1" filters={{ status: 'all' }} onFiltersChange={vi.fn()} createDialogRequested />
    </TooltipProvider>,
  );

  const createButton = screen.getByRole('button', { name: 'New Job' });

  await expect.element(createButton).toHaveAttribute('aria-disabled', 'true');
  createButton.element().focus();
  expect(document.activeElement).toBe(createButton.element());
  await expect.element(screen.getByText('New job dialog open')).not.toBeInTheDocument();
});

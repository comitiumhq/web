import { TooltipProvider } from '@comitium/ui/tooltip';
import type { ReactNode } from 'react';
import { beforeEach, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { JobsListContent } from './jobs-list-content';

const mocks = vi.hoisted(() => ({
  creationContext: undefined as
    | { orgWide: boolean; departmentIds: string[]; setupAllowsJobCreation: boolean }
    | undefined,
  isCreationContextFetching: false,
}));

vi.mock('@/hooks/queries/use-query-job-creation-context', () => ({
  useQueryJobCreationContext: () => ({
    data: mocks.creationContext,
    isFetching: mocks.isCreationContextFetching,
  }),
}));

vi.mock('@/hooks/queries/use-query-jobs-with-drafts', () => ({
  useJobsWithDrafts: () => ({ jobs: [], drafts: [], isLoading: false }),
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
  JobsTable: ({ emptyState }: { emptyState: ReactNode }) => (
    <div className="flex min-h-0 flex-1 flex-col justify-center">{emptyState}</div>
  ),
}));

beforeEach(() => {
  mocks.creationContext = { orgWide: true, departmentIds: [], setupAllowsJobCreation: true };
  mocks.isCreationContextFetching = false;
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

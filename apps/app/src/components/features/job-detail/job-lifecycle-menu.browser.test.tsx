import type { JobSummary } from '@comitium/schemas/jobs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { JobLifecycleMenu } from './job-lifecycle-menu';

const mocks = vi.hoisted(() => ({
  openJob: vi.fn(),
}));

vi.mock('@/hooks/mutations/use-open-job', () => ({
  useOpenJob: () => ({ mutate: mocks.openJob, isPending: false }),
}));

vi.mock('@/hooks/use-job-permissions', () => ({
  useJobPermissions: () => ({ canOnJob: () => true, isLoading: false }),
}));

vi.mock('./close-job-dialog', () => ({ CloseJobDialog: () => null }));
vi.mock('./reopen-job-dialog', () => ({ ReopenJobDialog: () => null }));

const draftJob = {
  id: 'job-1',
  orgId: 'org-1',
  title: 'Backend Engineer',
  interviewPlanId: 'plan-1',
  status: 'draft',
  archivedAt: null,
  version: 2,
  lifecycle: {
    activeApplications: 0,
    allowedActions: ['open_job', 'publish_posting'],
  },
} as JobSummary;

const openJobWithApplications = {
  ...draftJob,
  status: 'open',
  lifecycle: {
    activeApplications: 2,
    allowedActions: ['close_job'],
  },
} as JobSummary;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('JobLifecycleMenu', () => {
  it('opens a Draft Job independently from publishing its Posting', async () => {
    const screen = await render(<JobLifecycleMenu job={draftJob} orgId="org-1" />);

    await screen.getByRole('button', { name: 'draft job status' }).click();
    await screen.getByRole('menuitem', { name: 'Open job' }).click();

    expect(mocks.openJob).toHaveBeenCalledExactlyOnceWith({ orgId: 'org-1', jobId: 'job-1' });
  });

  it('allows closing an Open Job while existing applications remain active', async () => {
    const screen = await render(<JobLifecycleMenu job={openJobWithApplications} orgId="org-1" />);

    await screen.getByRole('button', { name: 'open job status' }).click();

    await expect.element(screen.getByRole('menuitem', { name: 'Close job' })).toBeEnabled();
  });
});

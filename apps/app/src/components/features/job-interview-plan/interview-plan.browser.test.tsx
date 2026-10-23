import { TooltipProvider } from '@comitium/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode, useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import type { MyOrg } from '@/hooks/queries/use-query-my-orgs';
import { JobInterviewPlan } from './index';
import { TemplateInterviewPlan } from './template-interview-plan';

const mocks = vi.hoisted(() => ({
  savedPlanId: null as string | null,
  getOwnerActivities: vi.fn(),
  getOwnerActivityOptions: vi.fn(),
  updateJobTemplate: vi.fn(),
}));

vi.mock('@comitium/auth/use-is-authenticated', () => ({ useIsAuthenticated: () => true }));
vi.mock('@/hooks/use-permissions', () => ({ usePermissions: () => ({ can: () => true }) }));
vi.mock('@/hooks/use-job-permissions', () => ({
  useJobPermissions: () => ({ canOnJob: () => true, isLoading: false }),
}));
vi.mock('@/hooks/queries/use-query-job-summary', () => ({
  useQueryJobSummary: () => ({
    data: { status: 'draft', interviewPlanId: mocks.savedPlanId },
    isLoading: false,
    error: null,
  }),
}));
vi.mock('@/lib/api/interview-plans', () => ({
  getInterviewPlans: async () => ({
    data: [
      { id: 'plan', name: 'Engineering loop', stageCount: 1, stageNames: ['Technical interview'], isDefault: true },
    ],
  }),
  getInterviewPlan: async () => ({
    data: {
      id: 'plan',
      name: 'Engineering loop',
      stages: [{ id: 'stage', name: 'Technical interview', stageOrder: 0, stageType: 'active', stageGroupId: null }],
    },
  }),
}));
vi.mock('@/lib/api/stage-activities', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api/stage-activities')>()),
  getOwnerActivities: mocks.getOwnerActivities,
  getOwnerActivityOptions: mocks.getOwnerActivityOptions,
}));
vi.mock('@/lib/api/job-templates', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api/job-templates')>()),
  updateJobTemplate: mocks.updateJobTemplate,
}));

function wrapper({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false } } }));

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>{children}</TooltipProvider>
    </QueryClientProvider>
  );
}

function DraftPlan() {
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  return (
    <>
      <JobInterviewPlan
        org={{ id: 'org' } as MyOrg}
        jobId="job"
        draftPlan={{ selectedPlanId, onSelectPlan: setSelectedPlanId, isSaving: false }}
      />
      <button
        type="button"
        disabled={saved}
        onClick={() => {
          mocks.savedPlanId = selectedPlanId;
          setSaved(true);
        }}
      >
        Save selection
      </button>
    </>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.savedPlanId = null;
  mocks.getOwnerActivities.mockImplementation(async () => {
    if (mocks.savedPlanId === null) {
      throw new Error('Job has no interview plan');
    }

    return { data: [] };
  });
  mocks.getOwnerActivityOptions.mockResolvedValue({
    data: { interviewTemplates: [], emailTemplates: [], feedbackForms: [], members: [] },
  });
});

describe('Interview plan selection', () => {
  it('previews a draft plan and loads editable activities only after saving it', async () => {
    const screen = await render(<DraftPlan />, { wrapper });

    await screen.getByRole('button', { name: 'Select plan', exact: true }).click();
    await screen.getByRole('button', { name: /Engineering loop/ }).click();
    await expect.element(screen.getByRole('heading', { name: 'Technical interview', exact: true })).toBeVisible();
    expect(mocks.getOwnerActivities).not.toHaveBeenCalled();
    await expect
      .element(screen.getByRole('button', { name: 'Add activity to Technical interview' }))
      .not.toBeInTheDocument();

    await screen.getByRole('button', { name: 'Save selection' }).click();
    await expect.element(screen.getByRole('button', { name: 'Add activity to Technical interview' })).toBeVisible();
    expect(mocks.getOwnerActivities).toHaveBeenCalledWith({ kind: 'job', jobId: 'job' });
  });

  it('waits for a template plan update and refreshed owner before loading its activities', async () => {
    let resolveSave!: (value: { success: boolean }) => void;
    mocks.updateJobTemplate.mockReturnValue(
      new Promise((resolve) => {
        resolveSave = resolve;
      }),
    );
    const screen = await render(
      <TemplateInterviewPlan orgId="org" templateId="template" selectedPlanId={null} isArchived={false} />,
      { wrapper },
    );

    await screen.getByRole('button', { name: 'Select plan', exact: true }).click();
    await screen.getByRole('button', { name: /Engineering loop/ }).click();
    await expect.element(screen.getByRole('heading', { name: 'Engineering loop', exact: true })).toBeVisible();
    await expect.element(screen.getByRole('button', { name: 'Change plan', exact: true })).toBeDisabled();
    expect(mocks.getOwnerActivities).not.toHaveBeenCalled();

    mocks.savedPlanId = 'plan';
    resolveSave({ success: true });
    await expect.element(screen.getByRole('button', { name: 'Change plan', exact: true })).toBeEnabled();
    expect(mocks.getOwnerActivities).not.toHaveBeenCalled();
    await screen.rerender(
      <TemplateInterviewPlan orgId="org" templateId="template" selectedPlanId="plan" isArchived={false} />,
    );
    await expect.element(screen.getByRole('button', { name: 'Add activity to Technical interview' })).toBeVisible();
    expect(mocks.getOwnerActivities).toHaveBeenCalledWith({
      kind: 'jobTemplate',
      orgId: 'org',
      templateId: 'template',
    });
  });
});

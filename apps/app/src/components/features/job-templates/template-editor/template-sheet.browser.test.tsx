import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  flush: vi.fn(),
  isNew: false,
}));

vi.mock('react-hook-form', () => ({
  useWatch: () => '',
}));

vi.mock('@comitium/ui/feature-sheet', () => ({
  FeatureSheetContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@comitium/ui/form', () => ({
  Form: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@comitium/ui/sheet', () => ({
  Sheet: ({ children, onOpenChange }: { children: React.ReactNode; onOpenChange: (open: boolean) => void }) => (
    <>
      <button type="button" onClick={() => onOpenChange(false)}>
        Close editor
      </button>
      {children}
    </>
  ),
  SheetDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  SheetTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}));

vi.mock('@/components/features/job-draft/job-settings-editor', () => ({
  JobSettingsEditor: () => <div>Settings</div>,
}));

vi.mock('@/components/features/job-criteria', () => ({
  CriteriaTab: () => null,
}));

vi.mock('@/components/features/job-draft/draft-section-skeleton', () => ({
  DetailsSkeleton: () => null,
}));

vi.mock('@/components/features/job-interview-plan/template-interview-plan', () => ({
  TemplateInterviewPlan: () => null,
}));

vi.mock('@/components/features/job-posting/posting-editor', () => ({
  PostingEditor: () => null,
}));

vi.mock('./header', () => ({
  TemplateHeader: () => null,
}));

vi.mock('./interview-plan-tab', () => ({
  InterviewPlanTab: () => null,
}));

vi.mock('./section-nav', () => ({
  TEMPLATE_SECTION_ITEMS: [],
  TemplateMobileSectionTabs: () => null,
  TemplateSectionNav: () => null,
}));

vi.mock('./utils', () => ({
  TEMPLATE_SECTION_ITEMS: [],
  getTemplateSection: () => ({ title: 'Settings' }),
}));

vi.mock('../../editor-autosave/autosave-navigation-guard', () => ({ AutosaveNavigationGuard: () => null }));

vi.mock('./use-template-form', () => ({
  useTemplateForm: () => ({
    template: { status: 'active', title: 'Senior Full-Stack Engineer' },
    isLoading: false,
    error: null,
    form: {
      control: {},
      getValues: () => 'Senior Full-Stack Engineer',
    },
    isDirty: true,
    isSaving: false,
    isNew: mocks.isNew,
    create: mocks.create,
    autosave: { isDirty: true, isSaving: false, error: null, hasInvalidChanges: false, flush: mocks.flush },
    description: null,
    formId: null,
    criteria: [],
    interviewPlanId: null,
    hiringTeam: [],
    handleDescriptionChange: vi.fn(),
    handleFormIdChange: vi.fn(),
    handleCriteriaChange: vi.fn(),
    handleInterviewPlanChange: vi.fn(),
    handleHiringTeamChange: vi.fn(),
  }),
}));

import { TemplateSheet } from './template-sheet';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.isNew = false;
  mocks.flush.mockResolvedValue(true);
});

describe('TemplateSheet', () => {
  it('waits for pending changes before closing the existing editor without save buttons', async () => {
    let finish!: (value: boolean) => void;

    mocks.flush.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );

    const onOpenChange = vi.fn();
    const screen = await render(
      <TemplateSheet
        orgId="org"
        templateId="template"
        isNew={false}
        open
        onOpenChange={onOpenChange}
        onCreated={vi.fn()}
      />,
    );

    await expect.element(screen.getByRole('button', { name: 'Save changes' })).not.toBeInTheDocument();

    await screen.getByRole('button', { name: 'Close editor' }).click();

    expect(onOpenChange).not.toHaveBeenCalled();
    await expect.element(screen.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible();

    finish(true);
    await expect.poll(() => onOpenChange.mock.calls).toEqual([[false]]);
  });

  it('keeps the editor open when a change cannot be saved', async () => {
    mocks.flush.mockResolvedValue(false);

    const onOpenChange = vi.fn();
    const screen = await render(
      <TemplateSheet
        orgId="org"
        templateId="template"
        isNew={false}
        open
        onOpenChange={onOpenChange}
        onCreated={vi.fn()}
      />,
    );

    await screen.getByRole('button', { name: 'Close editor' }).click();

    await expect.element(screen.getByRole('heading', { name: 'Leave without saving?' })).toBeVisible();

    expect(onOpenChange).not.toHaveBeenCalled();
    await screen.getByRole('button', { name: 'Keep editing' }).click();

    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it('retains an explicit creation action for a new template', async () => {
    mocks.isNew = true;

    const screen = await render(
      <TemplateSheet orgId="org" templateId={null} isNew open onOpenChange={vi.fn()} onCreated={vi.fn()} />,
    );

    await screen.getByRole('button', { name: 'Create template' }).click();

    expect(mocks.create).toHaveBeenCalledOnce();
  });
});

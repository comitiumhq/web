import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';

const mocks = vi.hoisted(() => ({
  save: vi.fn(),
}));

vi.mock('react-hook-form', () => ({
  useWatch: () => undefined,
}));

vi.mock('@comitium/ui/feature-sheet', () => ({
  FeatureSheetContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@comitium/ui/form', () => ({
  Form: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@comitium/ui/sheet', () => ({
  Sheet: ({ children }: { children: React.ReactNode }) => <>{children}</>,
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
    isNew: false,
    save: mocks.save,
    discard: vi.fn(),
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

describe('TemplateSheet', () => {
  it('allows saving a non-form change after an existing template initializes', async () => {
    const screen = await render(
      <TemplateSheet
        orgId="11111111-1111-4111-8111-111111111111"
        templateId="22222222-2222-4222-8222-222222222222"
        isNew={false}
        open
        onOpenChange={vi.fn()}
        onCreated={vi.fn()}
      />,
    );

    const saveButton = screen.getByRole('button', { name: 'Save changes' });

    await expect.element(saveButton).toBeEnabled();
    await saveButton.click();
    expect(mocks.save).toHaveBeenCalledOnce();
  });
});

import type { JobEditor } from '@comitium/schemas/jobs';
import { Form } from '@comitium/ui/form';
import { TooltipProvider } from '@comitium/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render, renderHook } from 'vitest-browser-react';
import type { MyOrg } from '@/hooks/queries/use-query-my-orgs';
import { AutosaveStatus } from '../editor-autosave/autosave-status';
import { HiringTeamTab } from '../hiring-team-editor/hiring-team-tab';
import { CriteriaTab } from '../job-criteria';
import { useDraftForm } from '../job-draft/use-draft-form';
import { JobInterviewPlan } from '../job-interview-plan';
import { TemplateInterviewPlan } from '../job-interview-plan/template-interview-plan';
import { PostingDescriptionEditor } from '../job-posting/posting-description-editor';
import { PostingEditor } from '../job-posting/posting-editor';
import { useTemplateForm } from '../job-templates/template-editor/use-template-form';
import { JobBasicSettingsCard } from './job-basic-settings-card';

const mocks = vi.hoisted(() => ({ saveJob: vi.fn(), saveTemplate: vi.fn(), createTemplate: vi.fn() }));
const job: JobEditor = {
  id: 'job',
  title: 'Engineer',
  status: 'draft',
  archivedAt: null,
  version: 4,
  description: {
    type: 'doc',
    content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Saved description.' }] }],
  },
  skills: [],
  formId: null,
  criteria: [],
  interviewPlanId: null,
  hiringTeam: [],
  departmentId: '11111111-1111-4111-8111-111111111111',
  departmentName: 'Product',
  locationId: '22222222-2222-4222-8222-222222222222',
  locationName: 'San Francisco',
  location: null,
  locationType: 'hybrid',
  employmentType: 'full_time',
  category: 'design',
  compensation: { tiers: [{ currency: 'USD', period: 'year', base_min: 150000, base_max: 190000 }] },
  compensationDisplayMode: 'inherit',
  applicationCapacity: null,
  sourceJobId: null,
  createdAt: '2026-10-23T12:00:00.000Z',
  updatedAt: '2026-10-23T12:00:00.000Z',
};

let persistedJob = structuredClone(job);

vi.mock('@/hooks/queries/use-query-job-editor', () => ({ useQueryJobEditor: () => ({ data: persistedJob }) }));
vi.mock('@/hooks/queries/use-query-job-summary', () => ({
  useQueryJobSummary: () => ({ data: { ...persistedJob, postingStatus: 'unpublished' } }),
}));
vi.mock('@/hooks/use-job-permissions', () => ({ useJobPermissions: () => ({ canOnJob: () => true }) }));
vi.mock('@/hooks/use-permissions', () => ({ usePermissions: () => ({ can: () => true }) }));
vi.mock('./use-save-job-editor', () => ({ useSaveJobEditor: () => ({ mutateAsync: mocks.saveJob }) }));
vi.mock('@/hooks/queries/use-query-job-templates', () => ({
  useQueryJobTemplate: (_orgId: string, templateId?: string) => ({
    data: templateId ? { ...persistedJob, status: 'inactive' } : undefined,
  }),
}));
vi.mock('@/hooks/mutations/use-job-template-mutations', () => ({
  useUpdateJobTemplate: () => ({ mutateAsync: mocks.saveTemplate }),
  useCreateJobTemplate: () => ({ mutate: mocks.createTemplate }),
}));
vi.mock('@/hooks/queries/use-query-org-structure', () => ({
  useQueryOrgDepartments: () => ({
    data: {
      data: [
        { id: job.departmentId, name: 'Product' },
        { id: '33333333-3333-4333-8333-333333333333', name: 'Engineering' },
      ],
    },
  }),
  useQueryOrgLocations: () => ({
    data: {
      data: [
        { id: job.locationId, name: 'San Francisco', locationType: 'hybrid', cityId: 1 },
        { id: '44444444-4444-4444-8444-444444444444', name: 'Berlin', locationType: 'on_site', cityId: 2 },
      ],
    },
  }),
}));
vi.mock('@/hooks/queries/use-query-org-team', () => ({
  useQueryOrgTeam: () => ({
    data: [
      {
        userId: '77777777-7777-4777-8777-777777777777',
        name: 'Alice',
        email: 'alice@example.test',
        isActive: true,
        hasVaultAccess: true,
      },
    ],
  }),
}));
vi.mock('@/hooks/queries/use-query-application-form-options', () => ({
  useQueryApplicationFormOptions: () => ({
    data: { data: [{ id: '88888888-8888-4888-8888-888888888888', title: 'Engineering application', sections: [] }] },
  }),
}));
vi.mock('@/hooks/queries/use-query-interview-plans', () => ({
  useQueryInterviewPlans: () => ({
    data: {
      data: [
        {
          id: '99999999-9999-4999-8999-999999999999',
          name: 'Engineering loop',
          stageCount: 0,
          stageNames: [],
        },
      ],
    },
  }),
}));
vi.mock('@/hooks/queries/use-query-interview-plan', () => ({
  useQueryInterviewPlan: () => ({ data: { data: { name: 'Engineering loop', stages: [] } } }),
}));
vi.mock('@/hooks/queries/use-query-pipeline', () => ({ useQueryPipeline: () => ({}) }));
vi.mock('@/hooks/queries/use-query-stage-activities', () => ({
  useQueryOwnerActivities: () => ({ data: { data: [] } }),
  useQueryOwnerActivityOptions: () => ({
    data: { data: { interviewTemplates: [], emailTemplates: [], feedbackForms: [], members: [] } },
  }),
}));

type UseConfigurationEditor = () => ReturnType<typeof useDraftForm> | ReturnType<typeof useTemplateForm>;

function ConfigurationHarness({
  useEditor,
  isJob,
  section = 'settings',
}: {
  useEditor: UseConfigurationEditor;
  isJob: boolean;
  section?: 'settings' | 'team' | 'criteria' | 'posting' | 'plan';
}) {
  const [queryClient] = useState(() => new QueryClient());
  const editor = useEditor();

  if (editor.isLoading) {
    return <div>Loading</div>;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AutosaveStatus autosave={editor.autosave} />
        <Form {...editor.form}>
          {section === 'settings' && (
            <JobBasicSettingsCard orgId="org" form={editor.form} showCompensationDisclosure={isJob} />
          )}
          {section === 'team' && (
            <HiringTeamTab
              orgId="org"
              hiringTeam={editor.hiringTeam}
              onChangeHiringTeam={editor.handleHiringTeamChange}
            />
          )}
          {section === 'criteria' && (
            <CriteriaTab criteria={editor.criteria} onChangeCriteria={editor.handleCriteriaChange} />
          )}
          {section === 'posting' && (
            <PostingEditor
              orgId="org"
              owner={isJob ? { kind: 'job', jobId: 'job' } : { kind: 'job_template' }}
              description={editor.description}
              onDescriptionChange={editor.handleDescriptionChange}
              skills={editor.skills}
              onSkillsChange={editor.handleSkillsChange}
              formId={editor.formId}
              onFormIdChange={editor.handleFormIdChange}
              applicationCapacity={editor.form.getValues('applicationCapacity')}
              onApplicationCapacityChange={
                isJob ? (value) => editor.form.setValue('applicationCapacity', value) : undefined
              }
            />
          )}
          {section === 'plan' &&
            (isJob ? (
              <JobInterviewPlan
                org={{ id: 'org' } as MyOrg}
                jobId="job"
                draftPlan={{
                  selectedPlanId: editor.interviewPlanId,
                  onSelectPlan: editor.handleInterviewPlanChange,
                  isSaving: editor.autosave.isSaving,
                }}
              />
            ) : (
              <TemplateInterviewPlan
                orgId="org"
                templateId="template"
                selectedPlanId={editor.interviewPlanId}
                savedPlanId={persistedJob.interviewPlanId}
                isSaving={editor.autosave.isSaving}
                isArchived={false}
                onSelectPlan={editor.handleInterviewPlanChange}
              />
            ))}
        </Form>
        {'create' in editor && editor.isNew && (
          <button type="button" onClick={editor.create}>
            Create template
          </button>
        )}
      </TooltipProvider>
    </QueryClientProvider>
  );
}

function AdapterHarness({
  useEditor,
  showDescription = false,
}: {
  useEditor: UseConfigurationEditor;
  showDescription?: boolean;
}) {
  const editor = useEditor();

  if (editor.isLoading) {
    return <div>Loading</div>;
  }

  return (
    <TooltipProvider>
      {showDescription && (
        <PostingDescriptionEditor content={editor.description} onChange={editor.handleDescriptionChange} />
      )}
      <AutosaveStatus autosave={editor.autosave} />
      <input aria-label="Title" {...editor.form.register('title')} />
      <button type="button" onClick={() => editor.handleInterviewPlanChange('plan')}>
        Choose plan
      </button>
      <button type="button" onClick={() => void editor.autosave.flush()}>
        Flush
      </button>
      {'create' in editor && (
        <button type="button" onClick={editor.create}>
          Create
        </button>
      )}
    </TooltipProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  persistedJob = structuredClone(job);
  mocks.saveJob.mockResolvedValue({ version: 5 });
  mocks.saveTemplate.mockResolvedValue({ success: true });
});

describe('Job and template autosave adapters', () => {
  it('creates a template with explicitly selected currency and period before amounts are filled', async () => {
    const screen = await render(<ConfigurationHarness useEditor={() => useTemplateForm('org', null)} isJob={false} />);

    await screen.getByRole('textbox', { name: /^Title/ }).fill('Engineering template');
    await screen.getByRole('combobox', { name: 'Currency', exact: true }).fill('CAD');
    await screen.getByRole('option', { name: 'CAD (C$)', exact: true }).click();
    await screen.getByRole('combobox', { name: 'Period', exact: true }).click();
    await screen.getByRole('option', { name: 'Month', exact: true }).click();

    expect(mocks.createTemplate).not.toHaveBeenCalled();
    expect(mocks.saveTemplate).not.toHaveBeenCalled();

    await screen.getByRole('button', { name: 'Create template', exact: true }).click();

    await expect
      .poll(() => mocks.createTemplate.mock.calls[0]?.[0]?.body)
      .toMatchObject({
        title: 'Engineering template',
        compensation: { tiers: [{ currency: 'CAD', period: 'month' }] },
      });
  });

  it('opens a populated job and template as already saved without sending updates', async () => {
    const jobScreen = await render(<AdapterHarness useEditor={() => useDraftForm('org', 'job')} showDescription />);

    await expect.element(jobScreen.getByLabelText('Title')).toHaveValue('Engineer');

    await expect.element(jobScreen.getByText('Saved', { exact: true })).toBeVisible();

    await expect.element(jobScreen.getByText('Saved description.', { exact: true })).toBeVisible();

    expect(mocks.saveJob).not.toHaveBeenCalled();
    await jobScreen.unmount();

    const templateScreen = await render(
      <AdapterHarness useEditor={() => useTemplateForm('org', 'template')} showDescription />,
    );

    await expect.element(templateScreen.getByLabelText('Title')).toHaveValue('Engineer');

    await expect.element(templateScreen.getByText('Saved', { exact: true })).toBeVisible();

    await expect.element(templateScreen.getByText('Saved description.', { exact: true })).toBeVisible();

    expect(mocks.saveTemplate).not.toHaveBeenCalled();
  });

  it('persists plan selection immediately and uses its returned version for the next edit', async () => {
    const screen = await render(<AdapterHarness useEditor={() => useDraftForm('org', 'job')} />);

    await expect.element(screen.getByLabelText('Title')).toHaveValue('Engineer');

    await screen.getByRole('button', { name: 'Choose plan' }).click();

    await expect.poll(() => mocks.saveJob.mock.calls).toEqual([[{ interviewPlanId: 'plan', expectedVersion: 4 }]]);

    await screen.getByLabelText('Title').fill('Engineer II');

    await screen.getByRole('button', { name: 'Flush' }).click();

    await expect.poll(() => mocks.saveJob.mock.calls.length).toBe(2);

    expect(mocks.saveJob).toHaveBeenLastCalledWith({ title: 'Engineer II', expectedVersion: 5 });
    await expect.element(screen.getByLabelText('Title')).toHaveValue('Engineer II');
  });

  it('does not persist an empty title with a plan change', async () => {
    const screen = await render(<AdapterHarness useEditor={() => useDraftForm('org', 'job')} />);

    await screen.getByLabelText('Title').fill('');

    await screen.getByRole('button', { name: 'Choose plan' }).click();

    await expect.poll(() => mocks.saveJob.mock.calls).toEqual([[{ interviewPlanId: 'plan', expectedVersion: 4 }]]);

    await expect.element(screen.getByLabelText('Title')).toHaveValue('');
  });

  it('saves template fields separately without reverting the selected plan', async () => {
    const screen = await render(<AdapterHarness useEditor={() => useTemplateForm('org', 'template')} />);

    await screen.getByRole('button', { name: 'Choose plan' }).click();

    await expect
      .poll(() => mocks.saveTemplate.mock.calls)
      .toEqual([[{ orgId: 'org', templateId: 'template', body: { interviewPlanId: 'plan' } }]]);

    await screen.getByLabelText('Title').fill('Engineer II');

    await screen.getByRole('button', { name: 'Flush' }).click();

    await expect.poll(() => mocks.saveTemplate.mock.calls.length).toBe(2);

    expect(mocks.saveTemplate).toHaveBeenLastCalledWith({
      orgId: 'org',
      templateId: 'template',
      body: { title: 'Engineer II' },
    });
  });

  it('does not create a new template through autosave', async () => {
    const screen = await render(<AdapterHarness useEditor={() => useTemplateForm('org', null)} />);

    await screen.getByLabelText('Title').fill('New template');

    await screen.getByRole('button', { name: 'Choose plan' }).click();

    await screen.getByRole('button', { name: 'Flush' }).click();

    expect(mocks.saveTemplate).not.toHaveBeenCalled();
    expect(mocks.createTemplate).not.toHaveBeenCalled();
    await screen.getByRole('button', { name: 'Create', exact: true }).click();

    await expect.poll(() => mocks.createTemplate.mock.calls.length).toBe(1);

    const { body } = mocks.createTemplate.mock.calls[0][0];

    expect(body).toMatchObject({ title: 'New template', interviewPlanId: 'plan' });
    expect(body.compensation).toBeUndefined();
    expect(body.criteria).toBeUndefined();
    expect(body.employmentType).toBeUndefined();
    expect(body.category).toBeUndefined();
  });
});

const adapters = [
  { name: 'Job', useEditor: () => useDraftForm('org', 'job'), save: mocks.saveJob },
  { name: 'Open Job', useEditor: () => useDraftForm('org', 'job'), save: mocks.saveJob },
  { name: 'Job Template', useEditor: () => useTemplateForm('org', 'template'), save: mocks.saveTemplate },
];

describe.each(adapters)('$name field persistence', ({ name, useEditor, save }) => {
  const isJob = name !== 'Job Template';
  const bodyOf = (call: unknown[]) => (isJob ? call[0] : (call[0] as { body: object }).body) as Partial<JobEditor>;

  beforeEach(() => {
    if (name === 'Open Job') {
      persistedJob.status = 'open';
    }
  });

  function persistEdits() {
    save.mockImplementation(async (...args: unknown[]) => {
      const changes = bodyOf(args);

      persistedJob = { ...persistedJob, ...changes, version: persistedJob.version + 1 };

      return { success: true, version: persistedJob.version };
    });
  }

  it.each([
    {
      label: 'Title',
      role: 'textbox',
      value: 'Engineer II',
      displayed: 'Engineer II',
      fields: { title: 'Engineer II' },
    },
    {
      label: 'Team',
      role: 'combobox',
      value: 'Engineering',
      displayed: 'Engineering',
      fields: { departmentId: '33333333-3333-4333-8333-333333333333' },
    },
    {
      label: 'Location',
      role: 'combobox',
      value: 'Berlin',
      displayed: 'Berlin',
      fields: { locationId: '44444444-4444-4444-8444-444444444444' },
    },
    {
      label: 'Category',
      role: 'combobox',
      value: 'Engineering',
      displayed: 'Engineering',
      fields: { category: 'engineering' },
    },
    {
      label: 'Category',
      role: 'combobox',
      value: '',
      displayed: '',
      fields: { category: null },
    },
    {
      label: 'Minimum compensation',
      role: 'textbox',
      value: '160000',
      displayed: '160,000',
      fields: { compensation: { tiers: [{ currency: 'USD', period: 'year', base_min: 160000, base_max: 190000 }] } },
    },
    {
      label: 'Maximum compensation',
      role: 'textbox',
      value: '200000',
      displayed: '200,000',
      fields: { compensation: { tiers: [{ currency: 'USD', period: 'year', base_min: 150000, base_max: 200000 }] } },
    },
  ] as const)(
    'round-trips $label independently through the rendered input',
    async ({ label, role, value, displayed, fields }) => {
      persistEdits();

      let screen = await render(<ConfigurationHarness useEditor={useEditor} isJob={isJob} />);

      expect(save).not.toHaveBeenCalled();

      const inputName = label === 'Title' ? /^Title/ : label;

      await screen.getByRole(role, { name: inputName, exact: true }).fill(value);

      if (role === 'combobox') {
        if (value) {
          await screen.getByRole('option', { name: value, exact: true }).click();
        } else {
          await userEvent.tab();
        }
      }

      await expect.poll(() => persistedJob).toMatchObject(fields);
      await expect.element(screen.getByText('Saved', { exact: true })).toBeVisible();
      expect(bodyOf(save.mock.calls[0])).toEqual({ ...fields, ...(isJob ? { expectedVersion: 4 } : {}) });
      await screen.unmount();

      screen = await render(<ConfigurationHarness useEditor={useEditor} isJob={isJob} />);

      await expect.element(screen.getByRole(role, { name: inputName, exact: true })).toHaveValue(displayed);
      expect(save).toHaveBeenCalledOnce();
    },
  );

  it('round-trips employment type and disclosure without resetting the budget', async () => {
    persistEdits();

    let screen = await render(<ConfigurationHarness useEditor={useEditor} isJob={isJob} />);

    await screen.getByRole('radio', { name: 'Contract', exact: true }).click();
    await expect.poll(() => persistedJob.employmentType).toBe('contract');
    await expect.element(screen.getByText('Saved', { exact: true })).toBeVisible();
    await screen.unmount();

    screen = await render(<ConfigurationHarness useEditor={useEditor} isJob={isJob} />);

    await expect
      .element(screen.getByRole('radio', { name: 'Contract', exact: true }))
      .toHaveAttribute('data-state', 'on');

    if (isJob) {
      await screen.getByRole('combobox', { name: 'Compensation disclosure' }).click();
      await screen.getByRole('option', { name: 'Not disclosed', exact: true }).click();
      await expect.poll(() => persistedJob.compensationDisplayMode).toBe('hidden');
      await expect.element(screen.getByText('Saved', { exact: true })).toBeVisible();
      await screen.unmount();

      screen = await render(<ConfigurationHarness useEditor={useEditor} isJob={isJob} />);

      await expect.element(screen.getByRole('textbox', { name: 'Minimum compensation' })).not.toBeInTheDocument();
      await screen.getByRole('combobox', { name: 'Compensation disclosure' }).click();
      await screen.getByRole('option', { name: 'Salary range', exact: true }).click();
      await expect.poll(() => persistedJob.compensationDisplayMode).toBe('inherit');
      await expect.element(screen.getByRole('textbox', { name: 'Minimum compensation' })).toHaveValue('150,000');
    }

    expect(persistedJob.compensation).toEqual(job.compensation);
  });

  it('round-trips adding a hiring-team member, changing their role and removing them', async () => {
    persistEdits();

    let screen = await render(<ConfigurationHarness useEditor={useEditor} isJob={isJob} section="team" />);

    await screen.getByRole('combobox', { name: 'Member', exact: true }).fill('Alice');
    await screen.getByRole('option', { name: /Alice/ }).click();
    await screen.getByRole('combobox', { name: 'Role', exact: true }).click();
    await screen.getByRole('option', { name: 'Hiring Member', exact: true }).click();

    expect(save).not.toHaveBeenCalled();

    await screen.getByRole('button', { name: 'Add', exact: true }).click();
    await expect
      .poll(() => persistedJob.hiringTeam)
      .toEqual([{ userId: '77777777-7777-4777-8777-777777777777', role: 'hiring_member' }]);
    await expect.element(screen.getByText('Saved', { exact: true })).toBeVisible();
    await screen.unmount();

    screen = await render(<ConfigurationHarness useEditor={useEditor} isJob={isJob} section="team" />);

    await expect.element(screen.getByText('Alice', { exact: true })).toBeVisible();
    await screen.getByRole('combobox', { name: '', exact: true }).click();
    await screen.getByRole('option', { name: 'Hiring Manager', exact: true }).click();
    await expect.poll(() => persistedJob.hiringTeam?.[0]?.role).toBe('hiring_manager');
    await expect.element(screen.getByText('Saved', { exact: true })).toBeVisible();
    await screen.unmount();

    screen = await render(<ConfigurationHarness useEditor={useEditor} isJob={isJob} section="team" />);

    await expect.element(screen.getByRole('combobox', { name: '', exact: true })).toHaveTextContent('Hiring Manager');
    await screen.getByRole('button', { name: 'Remove Alice', exact: true }).click();
    await screen.getByRole('dialog').getByRole('button', { name: 'Remove', exact: true }).click();
    await expect.poll(() => persistedJob.hiringTeam).toEqual([]);
    await expect.element(screen.getByText('Saved', { exact: true })).toBeVisible();
    await screen.unmount();

    screen = await render(<ConfigurationHarness useEditor={useEditor} isJob={isJob} section="team" />);

    await expect.element(screen.getByText('No team members yet', { exact: true })).toBeVisible();
    expect(save).toHaveBeenCalledTimes(3);
  });

  it('round-trips criterion creation, independent title/prompt edits and deletion', async () => {
    persistEdits();

    let screen = await render(<ConfigurationHarness useEditor={useEditor} isJob={isJob} section="criteria" />);

    await screen.getByRole('button', { name: 'Add criterion', exact: true }).click();
    await screen.getByRole('textbox', { name: 'Title', exact: true }).fill('Systems');

    expect(save).not.toHaveBeenCalled();

    await screen.getByRole('textbox', { name: 'Evaluation prompt', exact: true }).fill('Design a service.');
    await expect
      .poll(() => persistedJob.criteria)
      .toEqual([{ id: expect.any(String), title: 'Systems', prompt: 'Design a service.' }]);
    await expect.element(screen.getByText('Saved', { exact: true })).toBeVisible();
    await screen.unmount();

    screen = await render(<ConfigurationHarness useEditor={useEditor} isJob={isJob} section="criteria" />);

    await screen.getByRole('button', { name: /Systems/ }).click();
    await expect
      .element(screen.getByRole('textbox', { name: 'Evaluation prompt', exact: true }))
      .toHaveValue('Design a service.');
    await screen.getByRole('textbox', { name: 'Title', exact: true }).fill('System design');
    await expect.poll(() => persistedJob.criteria?.[0]?.title).toBe('System design');
    await expect.element(screen.getByText('Saved', { exact: true })).toBeVisible();
    await screen.getByRole('textbox', { name: 'Evaluation prompt', exact: true }).fill('Discuss consistency.');
    await expect.poll(() => persistedJob.criteria?.[0]?.prompt).toBe('Discuss consistency.');
    await expect.element(screen.getByText('Saved', { exact: true })).toBeVisible();
    await screen.unmount();

    screen = await render(<ConfigurationHarness useEditor={useEditor} isJob={isJob} section="criteria" />);

    await screen.getByRole('button', { name: /System design/ }).click();
    await expect
      .element(screen.getByRole('textbox', { name: 'Evaluation prompt', exact: true }))
      .toHaveValue('Discuss consistency.');
    await screen.getByRole('button', { name: 'Delete criterion', exact: true }).click();
    await screen.getByRole('dialog').getByRole('button', { name: 'Delete', exact: true }).click();
    await expect.poll(() => persistedJob.criteria).toBeNull();
    await expect.element(screen.getByText('Saved', { exact: true })).toBeVisible();
    await screen.unmount();

    screen = await render(<ConfigurationHarness useEditor={useEditor} isJob={isJob} section="criteria" />);

    await expect.element(screen.getByRole('button', { name: 'Add criterion', exact: true })).toBeVisible();
    expect(save).toHaveBeenCalledTimes(4);
  });

  it('round-trips description, application form and capacity through the Posting controls', async () => {
    persistEdits();

    let screen = await render(<ConfigurationHarness useEditor={useEditor} isJob={isJob} section="posting" />);
    const editable = screen.container.querySelector('[contenteditable="true"]');

    if (!editable) {
      throw new Error('Description editor is missing');
    }

    await page.elementLocator(editable).fill('Updated description.');
    await expect.poll(() => persistedJob.description?.content?.[0]?.content?.[0]?.text).toBe('Updated description.');
    await expect.element(screen.getByText('Saved', { exact: true })).toBeVisible();
    await screen.unmount();

    screen = await render(<ConfigurationHarness useEditor={useEditor} isJob={isJob} section="posting" />);

    await expect.element(screen.getByText('Updated description.', { exact: true })).toBeVisible();
    await screen.getByRole('tab', { name: 'Application form', exact: true }).click();
    await screen.getByRole('button', { name: 'Select Engineering application', exact: true }).click();
    await expect.poll(() => persistedJob.formId).toBe('88888888-8888-4888-8888-888888888888');
    await expect.element(screen.getByText('Saved', { exact: true })).toBeVisible();
    await screen.unmount();

    screen = await render(<ConfigurationHarness useEditor={useEditor} isJob={isJob} section="posting" />);

    await screen.getByRole('tab', { name: 'Application form', exact: true }).click();
    await expect
      .element(screen.getByRole('button', { name: 'Select Engineering application', exact: true }))
      .toHaveAttribute('aria-pressed', 'true');

    if (isJob) {
      await screen.getByRole('tab', { name: 'Capacity', exact: true }).click();
      await screen.getByRole('switch', { name: 'Limit applications', exact: true }).click();
      await expect.poll(() => persistedJob.applicationCapacity).toBe(50);
      await expect.element(screen.getByText('Saved', { exact: true })).toBeVisible();
      await screen.getByRole('spinbutton', { name: 'Maximum applications', exact: true }).fill('75');
      await expect.poll(() => persistedJob.applicationCapacity).toBe(75);
      await expect.element(screen.getByText('Saved', { exact: true })).toBeVisible();
      await screen.unmount();

      screen = await render(<ConfigurationHarness useEditor={useEditor} isJob={isJob} section="posting" />);

      await screen.getByRole('tab', { name: 'Capacity', exact: true }).click();
      await expect
        .element(screen.getByRole('spinbutton', { name: 'Maximum applications', exact: true }))
        .toHaveValue(75);
      await screen.getByRole('switch', { name: 'Limit applications', exact: true }).click();
      await expect.poll(() => persistedJob.applicationCapacity).toBeNull();
      await expect.element(screen.getByText('Saved', { exact: true })).toBeVisible();
      await screen.unmount();

      screen = await render(<ConfigurationHarness useEditor={useEditor} isJob={isJob} section="posting" />);

      await screen.getByRole('tab', { name: 'Capacity', exact: true }).click();
      await expect.element(screen.getByRole('switch', { name: 'Limit applications', exact: true })).not.toBeChecked();
    }
  });

  it('round-trips interview-plan selection through the plan picker', async () => {
    persistEdits();

    let screen = await render(<ConfigurationHarness useEditor={useEditor} isJob={isJob} section="plan" />);

    await screen.getByRole('button', { name: 'Select plan', exact: true }).click();
    await screen.getByRole('button', { name: /Engineering loop/ }).click();
    await expect.poll(() => persistedJob.interviewPlanId).toBe('99999999-9999-4999-8999-999999999999');
    await expect.element(screen.getByText('Saved', { exact: true })).toBeVisible();
    await screen.unmount();

    screen = await render(<ConfigurationHarness useEditor={useEditor} isJob={isJob} section="plan" />);

    await expect.element(screen.getByRole('button', { name: 'Change plan', exact: true })).toBeEnabled();
    await expect.element(screen.getByRole('heading', { name: 'Engineering loop', exact: true })).toBeVisible();
    expect(save).toHaveBeenCalledOnce();
  });

  it.each([true, false])('persists currency and period independently with amounts present: %s', async (hasAmounts) => {
    if (!hasAmounts) {
      persistedJob.compensation = null;
    }

    persistEdits();

    let screen = await render(<ConfigurationHarness useEditor={useEditor} isJob={isJob} />);

    await screen.getByRole('combobox', { name: 'Currency', exact: true }).fill('CAD');
    await screen.getByRole('option', { name: 'CAD (C$)', exact: true }).click();

    await expect.poll(() => persistedJob.compensation?.tiers[0]?.currency).toBe('CAD');
    await expect.element(screen.getByText('Saved', { exact: true })).toBeVisible();
    await screen.unmount();

    screen = await render(<ConfigurationHarness useEditor={useEditor} isJob={isJob} />);

    await expect.element(screen.getByRole('combobox', { name: 'Currency', exact: true })).toHaveValue('CAD (C$)');
    await screen.getByRole('combobox', { name: 'Period', exact: true }).click();
    await screen.getByRole('option', { name: 'Month', exact: true }).click();

    await expect.poll(() => persistedJob.compensation?.tiers[0]?.period).toBe('month');
    await expect.element(screen.getByText('Saved', { exact: true })).toBeVisible();
    await screen.unmount();

    screen = await render(<ConfigurationHarness useEditor={useEditor} isJob={isJob} />);

    await expect.element(screen.getByRole('combobox', { name: 'Currency', exact: true })).toHaveValue('CAD (C$)');
    await expect.element(screen.getByRole('combobox', { name: 'Period', exact: true })).toHaveTextContent('Month');
    expect(save).toHaveBeenCalledTimes(2);
  });

  it('persists a period selected first with no amounts and does not write defaults on opening', async () => {
    persistedJob.compensation = null;
    persistEdits();

    let screen = await render(<ConfigurationHarness useEditor={useEditor} isJob={isJob} />);

    expect(save).not.toHaveBeenCalled();

    await screen.getByRole('combobox', { name: 'Period', exact: true }).click();
    await screen.getByRole('option', { name: 'Month', exact: true }).click();
    await expect.poll(() => persistedJob.compensation).toEqual({ tiers: [{ currency: 'USD', period: 'month' }] });
    await expect.element(screen.getByText('Saved', { exact: true })).toBeVisible();
    await screen.unmount();

    screen = await render(<ConfigurationHarness useEditor={useEditor} isJob={isJob} />);

    await expect.element(screen.getByRole('combobox', { name: 'Period', exact: true })).toHaveTextContent('Month');
    expect(save).toHaveBeenCalledOnce();
  });

  it('preserves currency and period when the amounts are cleared through the inputs', async () => {
    persistEdits();

    let screen = await render(<ConfigurationHarness useEditor={useEditor} isJob={isJob} />);

    await screen.getByRole('textbox', { name: 'Minimum compensation', exact: true }).fill('');
    await expect.poll(() => persistedJob.compensation?.tiers[0]?.base_min).toBeUndefined();
    await expect.element(screen.getByText('Saved', { exact: true })).toBeVisible();
    await screen.getByRole('textbox', { name: 'Maximum compensation', exact: true }).fill('');
    await expect.poll(() => persistedJob.compensation).toEqual({ tiers: [{ currency: 'USD', period: 'year' }] });
    await expect.element(screen.getByText('Saved', { exact: true })).toBeVisible();
    await screen.unmount();

    screen = await render(<ConfigurationHarness useEditor={useEditor} isJob={isJob} />);

    await expect.element(screen.getByRole('textbox', { name: 'Minimum compensation', exact: true })).toHaveValue('');
    await expect.element(screen.getByRole('textbox', { name: 'Maximum compensation', exact: true })).toHaveValue('');
    await expect.element(screen.getByRole('combobox', { name: 'Currency', exact: true })).toHaveValue('USD ($)');
    await expect.element(screen.getByRole('combobox', { name: 'Period', exact: true })).toHaveTextContent('Year');
    expect(save).toHaveBeenCalledTimes(2);
  });

  it('saves settings, compensation and content as partial updates, including explicit clears', async () => {
    const { result } = await renderHook(() => useEditor());

    await expect.poll(() => result.current.form.getValues('title')).toBe('Engineer');

    const description = {
      type: 'doc' as const,
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'New description.' }] }],
    };
    const criteria = [
      { id: '55555555-5555-4555-8555-555555555555', title: ' Systems ', prompt: ' Design a service. ' },
    ];
    const skillId = '66666666-6666-4666-8666-666666666666';
    const userId = '77777777-7777-4777-8777-777777777777';
    const formId = '88888888-8888-4888-8888-888888888888';

    await act(() => {
      const editor = result.current;

      editor.form.setValue('departmentId', '33333333-3333-4333-8333-333333333333');
      editor.form.setValue('locationId', '44444444-4444-4444-8444-444444444444');
      editor.form.setValue('employmentType', 'contract');
      editor.form.setValue('category', 'engineering');
      editor.form.setValue('compensationCurrency', 'EUR');
      editor.form.setValue('compensationPeriod', 'month');
      editor.form.setValue('compensationMin', 5000);
      editor.form.setValue('compensationMax', 8000);

      if (isJob) {
        editor.form.setValue('applicationCapacity', 100);
      }

      editor.handleDescriptionChange(description);
      editor.handleSkillsChange([{ skillId, required: true, label: 'Systems design', status: 'active' }]);
      editor.handleFormIdChange(formId);
      editor.handleCriteriaChange(criteria);
      editor.handleHiringTeamChange([{ userId, role: 'hiring_manager', name: 'Internal label' }]);
    });

    await act(() => result.current.autosave.flush());

    expect(save).toHaveBeenCalledOnce();
    expect(bodyOf(save.mock.calls[0])).toEqual({
      departmentId: '33333333-3333-4333-8333-333333333333',
      locationId: '44444444-4444-4444-8444-444444444444',
      employmentType: 'contract',
      category: 'engineering',
      compensation: { tiers: [{ currency: 'EUR', period: 'month', base_min: 5000, base_max: 8000 }] },
      description,
      skills: [{ skillId, required: true }],
      formId,
      criteria: [{ ...criteria[0], title: 'Systems', prompt: 'Design a service.' }],
      hiringTeam: [{ userId, role: 'hiring_manager' }],
      ...(isJob ? { applicationCapacity: 100, expectedVersion: 4 } : {}),
    });
    await act(() => {
      const editor = result.current;

      editor.form.setValue('category', undefined);
      editor.form.setValue('compensationMin', undefined);
      editor.form.setValue('compensationMax', undefined);

      if (isJob) {
        editor.form.setValue('applicationCapacity', null);
      }

      editor.handleDescriptionChange({ type: 'doc', content: [{ type: 'paragraph' }] });
      editor.handleSkillsChange([]);
      editor.handleFormIdChange(null);
      editor.handleCriteriaChange([]);
      editor.handleHiringTeamChange([]);
    });

    await act(() => result.current.autosave.flush());

    expect(save).toHaveBeenCalledTimes(2);
    expect(bodyOf(save.mock.calls[1])).toEqual({
      category: null,
      compensation: { tiers: [{ currency: 'EUR', period: 'month', base_min: undefined, base_max: undefined }] },
      description: { type: 'doc', content: [{ type: 'paragraph' }] },
      skills: [],
      formId: null,
      criteria: null,
      hiringTeam: [],
      ...(isJob ? { applicationCapacity: null, expectedVersion: 5 } : {}),
    });
    expect(result.current.autosave.isDirty).toBe(false);
  });

  it('keeps invalid compensation and incomplete criteria local while saving an independent form choice', async () => {
    const { result } = await renderHook(() => useEditor());

    await expect.poll(() => result.current.form.getValues('title')).toBe('Engineer');

    const criterion = { id: '55555555-5555-4555-8555-555555555555', title: 'Systems', prompt: '' };

    await act(() => {
      result.current.form.setValue('compensationMin', 200000);
      result.current.form.setValue('compensationMax', 100000);
      result.current.handleCriteriaChange([criterion]);
      result.current.handleFormIdChange('form');
    });

    await act(() => result.current.autosave.flush());

    expect(bodyOf(save.mock.calls[0])).toEqual({ formId: 'form', ...(isJob ? { expectedVersion: 4 } : {}) });
    expect(result.current.autosave.hasInvalidChanges).toBe(true);
    expect(result.current.criteria).toEqual([criterion]);

    const status = await render(
      <TooltipProvider>
        <AutosaveStatus autosave={result.current.autosave} />
      </TooltipProvider>,
    );
    const warning = status.getByRole('button', { name: 'Unsaved changes' });

    await expect.element(warning).toHaveAttribute('data-variant', 'warning');
    await warning.hover();
    await expect
      .element(status.getByRole('tooltip'))
      .toHaveTextContent('Maximum compensation: Must be at least the minimum compensation');
    await expect.element(status.getByRole('tooltip')).toHaveTextContent('Criterion 1: Evaluation prompt is required');

    await act(() => {
      result.current.form.setValue('compensationMax', 250000);
      result.current.handleCriteriaChange([{ ...criterion, prompt: 'Design a service.' }]);
    });

    await act(() => result.current.autosave.flush());

    expect(bodyOf(save.mock.calls[1])).toEqual({
      compensation: { tiers: [{ currency: 'USD', period: 'year', base_min: 200000, base_max: 250000 }] },
      criteria: [{ ...criterion, prompt: 'Design a service.' }],
      ...(isJob ? { expectedVersion: 5 } : {}),
    });
    expect(result.current.autosave.isDirty).toBe(false);

    await status.rerender(
      <TooltipProvider>
        <AutosaveStatus autosave={result.current.autosave} />
      </TooltipProvider>,
    );
    await expect.element(status.getByRole('button', { name: 'Unsaved changes' })).not.toBeInTheDocument();
    await expect.element(status.getByRole('tooltip')).not.toBeInTheDocument();
  });
});

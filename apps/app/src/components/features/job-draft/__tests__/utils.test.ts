import type { JobEditor } from '@comitium/schemas/jobs';
import { describe, expect, it } from 'vitest';
import type { JobSettingsFormData } from '@/lib/schemas/job-settings-form';
import { prepareJobAutosave } from '../../job-settings/job-autosave-state';
import { draftToEditorState } from '../draft-editor-state';
import { isDraftEditorPath, validateForPublish } from '../utils';

const baseValues = {
  title: 'Draft: People Partner',
  departmentId: '11111111-1111-4111-8111-111111111111',
  locationId: '22222222-2222-4222-8222-222222222222',
  locationType: 'hybrid',
  employmentType: 'full_time',
  category: 'hr',
  compensationCurrency: 'USD',
  compensationPeriod: 'year',
  compensationMin: 115000,
  compensationMax: 150000,
  compensationDisplayMode: 'inherit',
} satisfies JobSettingsFormData;

describe('job draft utils', () => {
  it('keeps incomplete criteria local instead of silently deleting them', () => {
    const criteria = [
      { id: '44444444-4444-4444-8444-444444444444', title: 'Communication', prompt: 'Assess communication.' },
      { id: '55555555-5555-4555-8555-555555555555', title: '', prompt: '' },
    ];
    const snapshot = prepareJobAutosave({
      values: baseValues,
      description: null,
      skills: [],
      formId: null,
      criteria,
      interviewPlanId: null,
      hiringTeam: [],
    });

    expect(snapshot.blockedKeys).toContain('criteria');
    expect(snapshot.data.criteria).toEqual(criteria);
    expect(snapshot.blockedKeys).not.toContain('title');
  });

  it('does not send location type without a selected location', () => {
    const values = { ...baseValues, locationId: undefined, locationType: undefined };
    const update = prepareJobAutosave({
      values,
      description: null,
      skills: [],
      formId: null,
      criteria: [],
      interviewPlanId: null,
      hiringTeam: [],
    }).data;

    expect(update).not.toHaveProperty('locationId');
    expect(update).not.toHaveProperty('locationType');
  });

  it('includes currency and period defaults in the normalized compensation baseline', () => {
    const draft = {
      id: '88888888-8888-4888-8888-888888888888',
      status: 'draft',
      archivedAt: null,
      title: 'People Lead',
      departmentId: baseValues.departmentId,
      locationId: baseValues.locationId,
      location: null,
      locationType: 'hybrid',
      employmentType: null,
      category: null,
      compensation: null,
      compensationDisplayMode: 'inherit',
      description: null,
      skills: [],
      formId: null,
      applicationCapacity: null,
      criteria: null,
      interviewPlanId: null,
      hiringTeam: [],
      sourceJobId: null,
      version: 0,
      createdAt: '2026-08-11T00:00:00.000Z',
      updatedAt: '2026-08-11T00:00:00.000Z',
    } satisfies JobEditor;
    const state = draftToEditorState(draft);

    expect(state.values).toMatchObject({ compensationCurrency: 'USD', compensationPeriod: 'year' });
    expect(prepareJobAutosave(state).data.compensation).toEqual({ tiers: [{ currency: 'USD', period: 'year' }] });
  });

  it('keeps section navigation inside the current editor', () => {
    const orgId = '11111111-1111-4111-8111-111111111111';
    const jobId = '22222222-2222-4222-8222-222222222222';

    expect(isDraftEditorPath(`/org/${orgId}/jobs/${jobId}/posting`, orgId, jobId)).toBe(true);
    expect(isDraftEditorPath(`/org/${orgId}/jobs/33333333-3333-4333-8333-333333333333/settings`, orgId, jobId)).toBe(
      false,
    );
    expect(isDraftEditorPath(`/org/${orgId}/jobs`, orgId, jobId)).toBe(false);
  });

  it('requires an application form before publishing', () => {
    const description = {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Build the product.' }] }],
    };
    const input = {
      values: baseValues,
      description,
      formId: null,
      formIsArchived: false,
      criteria: [],
      interviewPlanId: '66666666-6666-4666-8666-666666666666',
    };

    expect(validateForPublish(input)).toContainEqual({
      label: 'Application form',
      target: 'posting',
    });
    expect(validateForPublish({ ...input, formId: '33333333-3333-4333-8333-333333333333' })).toEqual([]);
  });

  it('rejects archived forms, invalid capacity, and a missing interview plan', () => {
    const errors = validateForPublish({
      values: { ...baseValues, applicationCapacity: 0 },
      description: {
        type: 'doc',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Build the product.' }] }],
      },
      formId: '33333333-3333-4333-8333-333333333333',
      formIsArchived: true,
      criteria: [],
      interviewPlanId: null,
    });

    expect(errors).toEqual([
      { label: 'Application form', target: 'posting' },
      { label: 'Application capacity', target: 'posting' },
      { label: 'Interview plan', target: 'interview-plan' },
    ]);
  });

  it('publishes without a range only when compensation is explicitly not disclosed', () => {
    const input = {
      values: { ...baseValues, compensationMin: undefined, compensationMax: undefined },
      description: {
        type: 'doc',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Build the product.' }] }],
      },
      formId: '33333333-3333-4333-8333-333333333333',
      formIsArchived: false,
      criteria: [],
      interviewPlanId: '66666666-6666-4666-8666-666666666666',
    };

    expect(validateForPublish(input)).toEqual([{ label: 'Compensation', target: 'settings' }]);
    expect(validateForPublish({ ...input, values: { ...input.values, compensationDisplayMode: 'hidden' } })).toEqual(
      [],
    );

    const saved = prepareJobAutosave({
      values: { ...baseValues, compensationDisplayMode: 'hidden' },
      description: null,
      skills: [],
      formId: null,
      criteria: [],
      interviewPlanId: null,
      hiringTeam: [],
    });

    expect(saved.data.compensationDisplayMode).toBe('hidden');
    expect(saved.data.compensation?.tiers[0]).toMatchObject({ base_min: 115000, base_max: 150000 });

    const incompleteRange = {
      values: input.values,
      description: null,
      skills: [],
      formId: null,
      criteria: [],
      interviewPlanId: null,
      hiringTeam: [],
    };
    const published = prepareJobAutosave(incompleteRange, { isPostingPublished: true });

    expect(published.blockedKeys).toEqual(['compensation', 'compensationDisplayMode']);
    expect(prepareJobAutosave(incompleteRange).blockedKeys).toEqual([]);

    for (const compensationDisplayMode of ['hidden', 'custom'] as const) {
      const snapshot = prepareJobAutosave(
        { ...incompleteRange, values: { ...input.values, compensationDisplayMode } },
        { isPostingPublished: true },
      );

      expect(snapshot.blockedKeys).toEqual([]);
    }
  });
});

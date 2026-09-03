import type { JobDraft } from '@comitium/schemas/jobs';
import { describe, expect, it } from 'vitest';
import type { DraftFormData } from '@/lib/schemas/draft-form';

import { draftToEditorState, prepareDraftSave } from '../draft-editor-state';
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
} satisfies DraftFormData;

describe('job draft utils', () => {
  it('builds one complete versioned update from the editor state', () => {
    const description = { type: 'doc', content: [{ type: 'paragraph' }] };

    expect(
      prepareDraftSave(
        {
          values: { ...baseValues, title: '  People Lead  ' },
          description,
          formId: '33333333-3333-4333-8333-333333333333',
          criteria: [
            {
              id: '44444444-4444-4444-8444-444444444444',
              title: 'Communication',
              prompt: 'Assess communication.',
            },
            {
              id: '55555555-5555-4555-8555-555555555555',
              title: '',
              prompt: '',
            },
          ],
          interviewPlanId: '66666666-6666-4666-8666-666666666666',
          hiringTeam: [
            {
              userId: '77777777-7777-4777-8777-777777777777',
              role: 'hiring_manager',
            },
          ],
        },
        4,
      ).data,
    ).toEqual({
      expectedVersion: 4,
      title: 'People Lead',
      departmentId: baseValues.departmentId,
      locationId: baseValues.locationId,
      locationType: 'hybrid',
      employmentType: 'full_time',
      category: 'hr',
      compensation: {
        tiers: [
          {
            currency: 'USD',
            period: 'year',
            base_min: 115000,
            base_max: 150000,
          },
        ],
      },
      description,
      formId: '33333333-3333-4333-8333-333333333333',
      criteria: [
        {
          id: '44444444-4444-4444-8444-444444444444',
          title: 'Communication',
          prompt: 'Assess communication.',
        },
      ],
      interviewPlanId: '66666666-6666-4666-8666-666666666666',
      hiringTeam: [
        {
          userId: '77777777-7777-4777-8777-777777777777',
          role: 'hiring_manager',
        },
      ],
    });
  });

  it('does not send location type without a selected location', () => {
    const values = { ...baseValues, locationId: undefined, locationType: undefined };
    const update = prepareDraftSave(
      {
        values,
        description: null,
        formId: null,
        criteria: [],
        interviewPlanId: null,
        hiringTeam: [],
      },
      2,
    ).data;

    expect(update).not.toHaveProperty('locationId');
    expect(update).not.toHaveProperty('locationType');
  });

  it('uses display defaults without persisting empty compensation', () => {
    const draft = {
      id: '88888888-8888-4888-8888-888888888888',
      title: 'People Lead',
      departmentId: baseValues.departmentId,
      locationId: baseValues.locationId,
      location: null,
      locationType: 'hybrid',
      employmentType: null,
      category: null,
      compensation: null,
      description: null,
      formId: null,
      criteria: null,
      interviewPlanId: null,
      hiringTeam: [],
      sourceJobId: null,
      version: 0,
      createdAt: '2026-08-11T00:00:00.000Z',
      updatedAt: '2026-08-11T00:00:00.000Z',
    } satisfies JobDraft;
    const state = draftToEditorState(draft);

    expect(state.values).toMatchObject({ compensationCurrency: 'USD', compensationPeriod: 'year' });
    expect(prepareDraftSave(state, 0).data.compensation).toBeNull();
  });

  it('keeps section navigation inside the current editor', () => {
    const orgId = '11111111-1111-4111-8111-111111111111';
    const jobId = '22222222-2222-4222-8222-222222222222';

    expect(isDraftEditorPath(`/org/${orgId}/jobs/${jobId}/description`, orgId, jobId)).toBe(true);
    expect(isDraftEditorPath(`/org/${orgId}/jobs/33333333-3333-4333-8333-333333333333/details`, orgId, jobId)).toBe(
      false,
    );
    expect(isDraftEditorPath(`/org/${orgId}/jobs`, orgId, jobId)).toBe(false);
  });

  it('requires an application form before publishing', () => {
    const description = {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Build the product.' }] }],
    };

    expect(validateForPublish(baseValues, description, null, [])).toContainEqual({
      label: 'Application form',
      tab: 'application-form',
    });
    expect(validateForPublish(baseValues, description, '33333333-3333-4333-8333-333333333333', [])).toEqual([]);
  });
});

import type { TipTapDoc } from '@comitium/schemas/common';
import { DEFAULT_COMPENSATION_CURRENCY, DEFAULT_COMPENSATION_PERIOD } from '@comitium/schemas/job-enums';
import type { EvaluationCriterion, HiringTeamEntry, JobDraft, UpdateDraftData } from '@comitium/schemas/jobs';
import type { DraftFormData } from '@/lib/schemas/draft-form';

import { buildCompensation, prepareEvaluationCriteria } from './utils';

export interface DraftEditorState {
  values: DraftFormData;
  description: TipTapDoc | null;
  formId: string | null;
  criteria: EvaluationCriterion[];
  interviewPlanId: string | null;
  hiringTeam: HiringTeamEntry[];
}

export function draftToEditorState(draft: JobDraft): DraftEditorState {
  return {
    values: {
      title: draft.title,
      departmentId: draft.departmentId ?? undefined,
      locationId: draft.locationId ?? undefined,
      location: draft.location ?? undefined,
      locationType: (draft.locationType as DraftFormData['locationType']) ?? undefined,
      employmentType: (draft.employmentType as DraftFormData['employmentType']) ?? undefined,
      category: (draft.category as DraftFormData['category']) ?? undefined,
      compensationCurrency:
        (draft.compensation?.tiers[0]?.currency as DraftFormData['compensationCurrency']) ??
        DEFAULT_COMPENSATION_CURRENCY,
      compensationPeriod:
        (draft.compensation?.tiers[0]?.period as DraftFormData['compensationPeriod']) ?? DEFAULT_COMPENSATION_PERIOD,
      compensationMin: draft.compensation?.tiers[0]?.base_min ?? undefined,
      compensationMax: draft.compensation?.tiers[0]?.base_max ?? undefined,
      applicationCapacity: draft.applicationCapacity,
    },
    description: (draft.description as TipTapDoc) ?? null,
    formId: draft.formId ?? null,
    criteria: draft.criteria ?? [],
    interviewPlanId: draft.interviewPlanId,
    hiringTeam: draft.hiringTeam ?? [],
  };
}

export function prepareDraftSave(state: DraftEditorState, expectedVersion: number, descriptionMarkdown: string) {
  const normalized: DraftEditorState = {
    ...state,
    values: {
      ...state.values,
      title: state.values.title.trim(),
    },
    criteria: prepareEvaluationCriteria(state.criteria),
  };

  const data: UpdateDraftData = {
    ...prepareJobSettingsUpdate(normalized.values, expectedVersion),
    description: normalized.description,
    descriptionMarkdown,
    formId: normalized.formId,
    applicationCapacity: normalized.values.applicationCapacity ?? null,
    criteria: normalized.criteria.length > 0 ? normalized.criteria : null,
    interviewPlanId: normalized.interviewPlanId,
    hiringTeam: normalized.hiringTeam.map((member) => ({
      userId: member.userId,
      role: member.role,
    })),
  };

  return { state: normalized, data };
}

export function prepareJobSettingsUpdate(values: DraftFormData, expectedVersion: number): UpdateDraftData {
  const normalizedValues = { ...values, title: values.title.trim() };
  const departmentUpdate = normalizedValues.departmentId ? { departmentId: normalizedValues.departmentId } : {};
  const locationUpdate = normalizedValues.locationId
    ? {
        locationId: normalizedValues.locationId,
        locationType: normalizedValues.locationType ?? null,
      }
    : {};

  return {
    expectedVersion,
    title: normalizedValues.title,
    ...departmentUpdate,
    ...locationUpdate,
    employmentType: normalizedValues.employmentType ?? null,
    category: normalizedValues.category ?? null,
    compensation: buildCompensation(normalizedValues),
  };
}

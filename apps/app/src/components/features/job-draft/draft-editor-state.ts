import type { TipTapDoc } from '@comitium/schemas/common';
import type { EvaluationCriterion, HiringTeamEntry, JobEditor, UpdateJobEditorData } from '@comitium/schemas/jobs';
import { prepareEvaluationCriteria } from '@/components/features/job-criteria/utils';
import {
  jobToSettingsFormValues,
  prepareJobSettingsUpdate,
} from '@/components/features/job-settings/job-settings-state';
import type { JobSettingsFormData } from '@/lib/schemas/job-settings-form';

export interface DraftEditorState {
  values: JobSettingsFormData;
  description: TipTapDoc | null;
  formId: string | null;
  criteria: EvaluationCriterion[];
  interviewPlanId: string | null;
  hiringTeam: HiringTeamEntry[];
}

export function draftToEditorState(draft: JobEditor): DraftEditorState {
  return {
    values: jobToSettingsFormValues(draft),
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

  const data: UpdateJobEditorData = {
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

import type { JobEditor } from '@comitium/schemas/jobs';
import type { JobConfigurationState } from '@/components/features/job-settings/job-autosave-state';
import { jobToSettingsFormValues } from '@/components/features/job-settings/job-settings-state';

export function draftToEditorState(draft: JobEditor): JobConfigurationState {
  return {
    values: jobToSettingsFormValues(draft),
    description: draft.description,
    skills: draft.skills,
    formId: draft.formId ?? null,
    criteria: draft.criteria ?? [],
    interviewPlanId: draft.interviewPlanId,
    hiringTeam: draft.hiringTeam ?? [],
  };
}

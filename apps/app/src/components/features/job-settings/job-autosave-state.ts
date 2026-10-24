import type { TipTapDoc } from '@comitium/schemas/common';
import type { EvaluationCriterion, HiringTeamEntry, UpdateJobEditorData } from '@comitium/schemas/jobs';
import { MAX_POSTING_SKILLS, type SkillRequirement } from '@comitium/schemas/skills';
import type { AutosaveSnapshot } from '@/hooks/use-autosave';
import { POSTING_SKILL_LIMIT_MESSAGE, toSkillSelections } from '@/lib/jobs/skills';
import { type JobSettingsFormData, JobSettingsFormSchema } from '@/lib/schemas/job-settings-form';
import { prepareCriteriaAutosave } from '../job-criteria/utils';
import { prepareJobSettingsUpdate } from './job-settings-state';

export type JobAutosaveData = Omit<UpdateJobEditorData, 'expectedVersion'>;

export interface JobConfigurationState {
  values: JobSettingsFormData;
  description: TipTapDoc | null;
  skills: SkillRequirement[];
  formId: string | null;
  criteria: EvaluationCriterion[];
  interviewPlanId: string | null;
  hiringTeam: HiringTeamEntry[];
}

const FIELD_LABELS: Partial<Record<keyof JobSettingsFormData, string>> = {
  title: 'Title',
  departmentId: 'Team',
  locationId: 'Location',
  location: 'Location',
  locationType: 'Location type',
  employmentType: 'Employment type',
  category: 'Category',
  compensationDisplayMode: 'Salary visibility',
  compensationCurrency: 'Currency',
  compensationPeriod: 'Pay period',
  compensationMin: 'Minimum compensation',
  compensationMax: 'Maximum compensation',
  applicationCapacity: 'Capacity',
};

function prepareSettingsAutosave(values: JobSettingsFormData): AutosaveSnapshot<JobAutosaveData> {
  const data = prepareJobSettingsUpdate(values);
  const result = JobSettingsFormSchema.safeParse(values);
  const blockedKeys: (keyof JobAutosaveData)[] = [];
  const validationMessages: Partial<Record<keyof JobAutosaveData, string[]>> = {};

  if (!result.success) {
    for (const issue of result.error.issues) {
      const field = String(issue.path[0]);
      const key = (field.startsWith('compensation') ? 'compensation' : field) as keyof JobAutosaveData;
      const label = FIELD_LABELS[field as keyof JobSettingsFormData] ?? field;

      blockedKeys.push(key);
      validationMessages[key] = [...(validationMessages[key] ?? []), `${label}: ${issue.message}`];
    }
  }

  if (blockedKeys.includes('compensation')) {
    blockedKeys.push('compensationDisplayMode');
    validationMessages.compensationDisplayMode = validationMessages.compensation;
  }

  return { data, blockedKeys, validationMessages };
}

/**
 * Normalize Job configuration and group validation errors by persisted field.
 * Independent valid fields can save without dropping incomplete local input.
 */
export function prepareJobAutosave(
  state: JobConfigurationState,
  { isPostingPublished = false }: { isPostingPublished?: boolean } = {},
): AutosaveSnapshot<JobAutosaveData> {
  const settings = prepareSettingsAutosave(state.values);
  const criteria = prepareCriteriaAutosave(state.criteria);
  const blockedKeys = [...(settings.blockedKeys ?? [])];
  const validationMessages = { ...settings.validationMessages };

  if (!criteria.valid) {
    blockedKeys.push('criteria');
    validationMessages.criteria = criteria.messages;
  }

  if (state.skills.length > MAX_POSTING_SKILLS) {
    blockedKeys.push('skills');
    validationMessages.skills = [POSTING_SKILL_LIMIT_MESSAGE];
  }

  const visiblePublishedRange =
    isPostingPublished &&
    state.values.compensationDisplayMode !== 'hidden' &&
    state.values.compensationDisplayMode !== 'custom';
  const incompleteRange = !state.values.compensationMin || !state.values.compensationMax;

  if (visiblePublishedRange && incompleteRange) {
    const messages = [
      ...(validationMessages.compensation ?? []),
      'Salary range: Enter both a minimum and a maximum amount for the published Posting',
    ];

    blockedKeys.push('compensation', 'compensationDisplayMode');
    validationMessages.compensation = messages;
    validationMessages.compensationDisplayMode = messages;
  }

  return {
    data: {
      ...settings.data,
      description: state.description,
      skills: toSkillSelections(state.skills),
      formId: state.formId,
      applicationCapacity: state.values.applicationCapacity ?? null,
      criteria: criteria.criteria,
      interviewPlanId: state.interviewPlanId,
      hiringTeam: state.hiringTeam.map(({ userId, role }) => ({ userId, role })),
    },
    blockedKeys,
    validationMessages,
  };
}

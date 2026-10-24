import { richTextToPlainText } from '@comitium/ui/rich-text';
import type { JobSettingsFormData } from '@/lib/schemas/job-settings-form';
import type { CreateJobTemplateBody, JobTemplate, UpdateJobTemplateBody } from '@/lib/schemas/job-templates';
import { type JobConfigurationState, prepareJobAutosave } from '../../job-settings/job-autosave-state';

/**
 * Map persisted template defaults to the shared configuration state.
 * Currency and period remain unset when the template has no compensation.
 */
export function templateToEditorState(template: JobTemplate): JobConfigurationState {
  return {
    values: {
      title: template.title,
      departmentId: template.departmentId ?? undefined,
      locationId: template.locationId ?? undefined,
      location: template.location ?? undefined,
      locationType: (template.locationType as JobSettingsFormData['locationType']) ?? undefined,
      employmentType: (template.employmentType as JobSettingsFormData['employmentType']) ?? undefined,
      category: (template.category as JobSettingsFormData['category']) ?? undefined,
      compensationCurrency:
        (template.compensation?.tiers[0]?.currency as JobSettingsFormData['compensationCurrency']) ?? undefined,
      compensationPeriod:
        (template.compensation?.tiers[0]?.period as JobSettingsFormData['compensationPeriod']) ?? undefined,
      compensationMin: template.compensation?.tiers[0]?.base_min ?? undefined,
      compensationMax: template.compensation?.tiers[0]?.base_max ?? undefined,
    },
    description: template.description,
    skills: template.skills,
    formId: template.formId,
    criteria: template.criteria ?? [],
    interviewPlanId: template.interviewPlanId,
    hiringTeam: template.hiringTeam ?? [],
  };
}

/**
 * Reuse configuration validation while excluding Job-only update fields.
 * Nullable template defaults use explicit null values when cleared.
 */
export function prepareTemplateAutosave(state: JobConfigurationState) {
  const { data, blockedKeys = [], validationMessages = {} } = prepareJobAutosave(state);
  const { applicationCapacity: _, compensationDisplayMode: _displayMode, ...fields } = data;
  const templateData: UpdateJobTemplateBody = {
    ...fields,
    departmentId: state.values.departmentId ?? null,
    locationId: state.values.locationId ?? null,
  };
  const templateBlockedKeys = blockedKeys.filter(
    (key) => key !== 'applicationCapacity' && key !== 'compensationDisplayMode',
  ) as (keyof UpdateJobTemplateBody)[];
  const {
    applicationCapacity: _capacityMessages,
    compensationDisplayMode: _displayMessages,
    ...templateMessages
  } = validationMessages;

  return { data: templateData, blockedKeys: templateBlockedKeys, validationMessages: templateMessages };
}

/**
 * Build the explicit Create request from the same normalized configuration.
 * Fields that only allow null during updates are omitted when empty.
 */
export function prepareTemplateCreate(state: JobConfigurationState): CreateJobTemplateBody {
  const { data } = prepareTemplateAutosave(state);
  const { compensation, criteria, employmentType, category, ...fields } = data;

  return {
    ...fields,
    title: state.values.title.trim(),
    description: richTextToPlainText(state.description) ? state.description : null,
    compensation: compensation ?? undefined,
    criteria: criteria ?? undefined,
    employmentType: employmentType ?? undefined,
    category: category ?? undefined,
  };
}

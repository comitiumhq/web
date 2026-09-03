import { httpsUrlSchema } from '@comitium/schemas/common';
import { z } from 'zod';

const URL_MAX_LENGTH = 2048;

const optionalUrlField = z
  .string()
  .trim()
  .max(URL_MAX_LENGTH, `Maximum ${URL_MAX_LENGTH} characters`)
  .pipe(z.union([z.literal(''), httpsUrlSchema], { error: 'Enter an HTTPS URL' }));

export const dataPrivacySettingsSchema = z.object({
  recruitingPrivacyPolicyUrl: z.string().max(URL_MAX_LENGTH).nullable(),
  recruitingLegalEntityName: z.string().max(255).nullable(),
  effectiveControllerName: z.string().max(255).nullable(),
  aiCriteriaEvaluationEnabled: z.boolean(),
  aiCriteriaEvaluationAdditionalNotice: z.string().max(2000).nullable(),
  aiCriteriaEvaluationAdditionalNoticeUrl: z.string().max(URL_MAX_LENGTH).nullable(),
});

export const dataPrivacySettingsResponseSchema = z.object({
  settings: dataPrivacySettingsSchema,
});

export const dataPrivacySettingsFormSchema = z.object({
  recruitingPrivacyPolicyUrl: optionalUrlField,
  recruitingLegalEntityName: z.string().trim().max(255, 'Maximum 255 characters'),
  aiCriteriaEvaluationEnabled: z.boolean(),
  aiCriteriaEvaluationAdditionalNotice: z.string().trim().max(2000, 'Maximum 2,000 characters'),
  aiCriteriaEvaluationAdditionalNoticeUrl: optionalUrlField,
});

export type DataPrivacySettings = z.infer<typeof dataPrivacySettingsSchema>;
export type DataPrivacySettingsResponse = z.infer<typeof dataPrivacySettingsResponseSchema>;
export type DataPrivacySettingsFormData = z.infer<typeof dataPrivacySettingsFormSchema>;
export type UpdateDataPrivacySettingsInput = Omit<DataPrivacySettings, 'effectiveControllerName'>;

export function toDataPrivacySettingsFormData(settings: DataPrivacySettings): DataPrivacySettingsFormData {
  return {
    recruitingPrivacyPolicyUrl: settings.recruitingPrivacyPolicyUrl ?? '',
    recruitingLegalEntityName: settings.recruitingLegalEntityName ?? '',
    aiCriteriaEvaluationEnabled: settings.aiCriteriaEvaluationEnabled,
    aiCriteriaEvaluationAdditionalNotice: settings.aiCriteriaEvaluationAdditionalNotice ?? '',
    aiCriteriaEvaluationAdditionalNoticeUrl: settings.aiCriteriaEvaluationAdditionalNoticeUrl ?? '',
  };
}

export function toUpdateDataPrivacySettingsInput(data: DataPrivacySettingsFormData): UpdateDataPrivacySettingsInput {
  return {
    recruitingPrivacyPolicyUrl: data.recruitingPrivacyPolicyUrl || null,
    recruitingLegalEntityName: data.recruitingLegalEntityName || null,
    aiCriteriaEvaluationEnabled: data.aiCriteriaEvaluationEnabled,
    aiCriteriaEvaluationAdditionalNotice: data.aiCriteriaEvaluationAdditionalNotice || null,
    aiCriteriaEvaluationAdditionalNoticeUrl: data.aiCriteriaEvaluationAdditionalNoticeUrl || null,
  };
}

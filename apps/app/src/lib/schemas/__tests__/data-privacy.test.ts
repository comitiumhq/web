import { describe, expect, it } from 'vitest';

import { dataPrivacySettingsFormSchema, toUpdateDataPrivacySettingsInput } from '../data-privacy';

const validSettings = {
  recruitingPrivacyPolicyUrl: 'https://example.com/privacy',
  recruitingLegalEntityName: 'Example Ltd',
  aiCriteriaEvaluationEnabled: true,
  aiCriteriaEvaluationAdditionalNotice: '',
  aiCriteriaEvaluationAdditionalNoticeUrl: '',
};

describe('dataPrivacySettingsFormSchema', () => {
  it('accepts HTTPS URLs', () => {
    expect(dataPrivacySettingsFormSchema.safeParse(validSettings).success).toBe(true);
  });

  it('rejects non-HTTPS URLs', () => {
    for (const recruitingPrivacyPolicyUrl of [
      'http://localhost:3001/privacy',
      'https://localhost:3001/privacy',
      'http://example.com/privacy',
      'javascript:alert(1)',
      'not-a-url',
    ]) {
      expect(dataPrivacySettingsFormSchema.safeParse({ ...validSettings, recruitingPrivacyPolicyUrl }).success).toBe(
        false,
      );
    }
  });

  it('trims values and maps empty optional fields to null', () => {
    const data = dataPrivacySettingsFormSchema.parse({
      ...validSettings,
      recruitingPrivacyPolicyUrl: '  https://example.com/privacy  ',
      recruitingLegalEntityName: '  Example Ltd  ',
    });

    expect(toUpdateDataPrivacySettingsInput(data)).toEqual({
      recruitingPrivacyPolicyUrl: 'https://example.com/privacy',
      recruitingLegalEntityName: 'Example Ltd',
      aiCriteriaEvaluationEnabled: true,
      aiCriteriaEvaluationAdditionalNotice: null,
      aiCriteriaEvaluationAdditionalNoticeUrl: null,
    });
  });
});

import { describe, expect, it } from 'vitest';

import {
  type CryptoContextInput,
  candidateNoteContext,
  candidateProfileContext,
  candidateTagContext,
  criterionEvidenceContext,
  customFieldValueContext,
  dataAad,
  emailContentContext,
  encryptedFileContext,
  keyWrapAad,
  normalizeCryptoContext,
  serializeDataAadContext,
  serializeKeyWrapAadContext,
} from '../context';

describe('crypto context', () => {
  it('normalizes optional IDs to explicit nulls', () => {
    expect(normalizeCryptoContext({ purpose: 'identity_hash' })).toEqual({
      purpose: 'identity_hash',
      orgId: null,
      subjectId: null,
      fieldId: null,
    });
  });

  it('rejects empty IDs, unknown purposes, and extra fields', () => {
    expect(() => normalizeCryptoContext({ purpose: 'application_answers', orgId: '' })).toThrow();
    expect(() => normalizeCryptoContext({ purpose: 'unknown' as never })).toThrow();
    expect(() => normalizeCryptoContext({ purpose: 'identity_hash', extra: 'x' } as never)).toThrow();
  });

  it('serializes data and key-wrap AAD with suite version and recipient binding', () => {
    const context: CryptoContextInput = {
      purpose: 'application_answers',
      orgId: 'org-1',
      subjectId: 'form-1',
      fieldId: 'answers',
    };

    expect(serializeDataAadContext(context)).toBe(
      '{"v":1,"purpose":"application_answers","orgId":"org-1","subjectId":"form-1","fieldId":"answers","zip":"none"}',
    );
    expect(serializeKeyWrapAadContext(context, 'org_vault')).toBe(
      '{"v":1,"purpose":"application_answers","orgId":"org-1","subjectId":"form-1","fieldId":"answers","recipient":"org_vault"}',
    );
    expect(new TextDecoder().decode(dataAad(context))).toBe(serializeDataAadContext(context));
    expect(new TextDecoder().decode(keyWrapAad(context, 'applicant'))).toBe(
      serializeKeyWrapAadContext(context, 'applicant'),
    );
  });

  it('builds real-use contexts for encrypted entities', () => {
    expect(encryptedFileContext('org-1', 'file-1', 'resume')).toEqual({
      purpose: 'encrypted_file',
      orgId: 'org-1',
      subjectId: 'file-1',
      fieldId: 'resume',
    });
    expect(candidateProfileContext('org-1', 'candidate-1')).toEqual({
      purpose: 'candidate_profile',
      orgId: 'org-1',
      subjectId: 'candidate-1',
      fieldId: 'profile',
    });
    expect(candidateNoteContext('org-1', 'candidate-1')).toEqual({
      purpose: 'candidate_note',
      orgId: 'org-1',
      subjectId: 'candidate-1',
      fieldId: 'note',
    });
    expect(candidateTagContext('org-1')).toEqual({
      purpose: 'candidate_tag',
      orgId: 'org-1',
      subjectId: 'org-1',
      fieldId: 'label',
    });
    expect(customFieldValueContext('org-1', 'candidate-1', 'field-1')).toEqual({
      purpose: 'custom_field_value',
      orgId: 'org-1',
      subjectId: 'candidate-1',
      fieldId: 'field-1',
    });
    expect(criterionEvidenceContext('org-1', 'application-1', 'criterion-1')).toEqual({
      purpose: 'criterion_evidence',
      orgId: 'org-1',
      subjectId: 'application-1',
      fieldId: 'criterion-1',
    });
    expect(emailContentContext('org-1', 'application-1')).toEqual({
      purpose: 'email_content',
      orgId: 'org-1',
      subjectId: 'application-1',
      fieldId: 'content',
    });
  });
});

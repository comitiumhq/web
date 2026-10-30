import { describe, expect, it, vi } from 'vitest';
import { decryptApplicationWithVaultKey, encryptApplicationWithVaultKey } from '../application-encryption';
import { type CandidateProfile, createCandidateProfile } from '../candidate-profile';
import { hashCandidateProfileSearchValue } from '../candidate-profile-search-hash';
import { type CandidateProjectionItem, candidateProjectionClaimResponseSchema } from '../candidate-projections';
import { applicationAnswerBucketContext, candidateProfileContext, candidateProfileEnrichmentContext } from '../context';
import { hashCustomFieldValue } from '../custom-field-hash';
import { hashCategoricalFormFieldValue } from '../form-field-search-hash';
import type { VaultKeyAccess } from '../schemas/vault-key';
import { type CandidateProjectionCrypto, processCandidateProjection } from '../worker/candidate-projection';
import { TEST_KEYS } from './crypto-helpers';

const orgId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const candidateId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const formId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const questionId = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const access = { orgId, vaultPublicKey: TEST_KEYS.alice.publicKey, vaultKeyVersion: 1 } as VaultKeyAccess;
const searchKey = new Uint8Array(32).fill(7);

const api: CandidateProjectionCrypto = {
  encryptApplication: encryptApplicationWithVaultKey,
  decryptApplication: (envelope, _orgId, _access, context) =>
    decryptApplicationWithVaultKey<Record<string, unknown>>(envelope, TEST_KEYS.alice.privateKey, context),
  hashCandidateProfileSearchValue: async (_org, _access, field, value) =>
    hashCandidateProfileSearchValue(searchKey, orgId, field, value),
  hashCategoricalFormFieldValue: async (_org, _access, field, kind, value) =>
    hashCategoricalFormFieldValue(searchKey, orgId, field, kind, value),
  hashCustomFieldValue: async (_org, _access, field, type, value) =>
    hashCustomFieldValue(searchKey, orgId, field, type, value),
};

const base = () =>
  createCandidateProfile({
    firstName: 'Ada',
    lastName: 'Lovelace',
    email: 'ada@example.com',
    phone: null,
    linkedIn: null,
    github: null,
    website: null,
    location: null,
    currentTitle: null,
    currentCompany: null,
  });

const encryptProfile = async (profile: CandidateProfile) => ({
  envelope: await api.encryptApplication(
    access.vaultPublicKey,
    1,
    profile,
    candidateProfileContext(orgId, candidateId),
  ),
  context: candidateProfileContext(orgId, candidateId),
});

const header = {
  workId: candidateId,
  generation: 1,
  claimToken: formId,
  claimedUntil: new Date().toISOString(),
  candidateId,
  applicationId: formId,
  source: { id: formId, revision: 1, visibility: 'standard' as const },
  mappingRevision: 1,
  projectorVersion: 1,
  expectedProfileRevision: 1,
};

async function formItem(profile = base()): Promise<Extract<CandidateProjectionItem, { kind: 'form_profile' }>> {
  return {
    ...header,
    kind: 'form_profile',
    inputs: {
      profile: await encryptProfile(profile),
      snapshot: {
        v: 1,
        formId,
        formClass: 'application',
        title: 'Apply',
        capturedAt: new Date().toISOString(),
        sections: [
          {
            id: formId,
            position: 0,
            title: 'Details',
            questions: [
              {
                id: questionId,
                prompt: 'Phone',
                questionType: 'phone',
                visibility: 'standard',
                isPrivate: false,
                isRequired: false,
                config: { candidateProfileField: 'phone' },
                reusableField: null,
              },
            ],
          },
        ],
      },
      answers: {
        envelope: await api.encryptApplication(
          access.vaultPublicKey,
          1,
          { [questionId]: '+12345' },
          applicationAnswerBucketContext(orgId, formId, 'standard'),
        ),
        context: applicationAnswerBucketContext(orgId, formId, 'standard'),
      },
      identityInputs: [],
    },
  };
}

describe('Candidate projection inside Crypto Worker', () => {
  it('rejects legacy seed locations and accepts canonical city identities', async () => {
    const item = await formItem();

    const question = item.inputs.snapshot.sections[0].questions[0];
    question.questionType = 'candidate_location';
    question.config = null;

    for (const [location, expected] of [
      [{ city: 'Berlin', region: 'California', country: 'US' }, 'retryable_error'],
      [{ cityId: 2950159, city: 'Berlin', country: 'DE' }, 'profile_merge'],
    ] as const) {
      item.inputs.answers = {
        envelope: await api.encryptApplication(
          access.vaultPublicKey,
          1,
          { [questionId]: location },
          applicationAnswerBucketContext(orgId, formId, 'standard'),
        ),
        context: applicationAnswerBucketContext(orgId, formId, 'standard'),
      };

      const result = await processCandidateProjection(api, orgId, access, item);

      expect(result.result.kind).toBe(expected);

      if (result.result.kind === 'retryable_error') {
        expect(result.result.code).toBe('INPUT_UNREADABLE');
      }
    }
  });

  it('validates the claim contract and returns only encrypted merge plus the existing search hashes', async () => {
    const item = (
      await candidateProjectionClaimResponseSchema.parseAsync({
        items: [await formItem()],
        hasMore: false,
        retryAfterMs: 15000,
      })
    ).items[0];

    const output = await processCandidateProjection(api, orgId, access, item);

    expect(output.result.kind).toBe('profile_merge');

    if (output.result.kind !== 'profile_merge') {
      throw new Error('Missing merge');
    }

    const profile = await api.decryptApplication(
      output.result.profile,
      orgId,
      access,
      candidateProfileContext(orgId, candidateId),
    );

    expect(profile).toMatchObject({ firstName: 'Ada', phone: '+12345', manuallyClearedFields: [] });

    expect(output.result.searchProjection.contactEmailDigest).toBe(
      hashCandidateProfileSearchValue(searchKey, orgId, 'email', 'ada@example.com'),
    );

    expect(JSON.stringify(output)).not.toContain('+12345');
    expect(JSON.stringify(output)).not.toContain('ada@example.com');
  });

  it('retains encrypted manual clears and does not rewrite a nonempty value', async () => {
    const profile = base();

    profile.manuallyClearedFields = ['phone'];

    expect((await processCandidateProjection(api, orgId, access, await formItem(profile))).result).toEqual({
      kind: 'no_change',
    });

    profile.manuallyClearedFields = [];
    profile.phone = '+999';

    expect((await processCandidateProjection(api, orgId, access, await formItem(profile))).result).toEqual({
      kind: 'no_change',
    });
  });

  it('keeps mapped form values before resume fill and does not copy private enrichment', async () => {
    const enrichmentContext = candidateProfileEnrichmentContext(orgId, questionId);

    const enrichment = {
      context: enrichmentContext,
      envelope: await api.encryptApplication(
        access.vaultPublicKey,
        1,
        { ...base(), phone: '+777', currentTitle: 'Engineer' },
        enrichmentContext,
      ),
    };

    const item: Extract<CandidateProjectionItem, { kind: 'resume_profile' }> = {
      ...header,
      kind: 'resume_profile',
      inputs: { profile: await encryptProfile({ ...base(), phone: '+12345' }), enrichment, visibility: 'standard' },
    };

    const output = await processCandidateProjection(api, orgId, access, item);

    if (output.result.kind !== 'profile_merge') {
      throw new Error('Missing resume merge');
    }

    expect(
      await api.decryptApplication(output.result.profile, orgId, access, candidateProfileContext(orgId, candidateId)),
    ).toMatchObject({ phone: '+12345', currentTitle: 'Engineer' });

    const decrypt = vi.spyOn(api, 'decryptApplication');

    expect(
      (
        await processCandidateProjection(api, orgId, access, {
          ...item,
          inputs: { ...item.inputs, visibility: 'private' },
        })
      ).result,
    ).toEqual({ kind: 'policy_skipped' });

    expect(decrypt).not.toHaveBeenCalled();

    decrypt.mockRestore();
  });

  it('rejects an old profile format and emits only safe input failure codes', async () => {
    const item = await formItem();

    const { manuallyClearedFields: _, ...old } = base();

    item.inputs.profile = await encryptProfile(old as CandidateProfile);

    const output = await processCandidateProjection(api, orgId, access, item);

    expect(output.result).toEqual({ kind: 'retryable_error', code: 'INPUT_UNREADABLE' });
    expect(JSON.stringify(output)).not.toContain('Ada');
  });

  it.each(['LinkedIn profile', 'https://', 'javascript:alert(1)'])(
    'ignores one invalid resume URL (%s) while applying other extracted values',
    async (linkedIn) => {
      const context = candidateProfileEnrichmentContext(orgId, questionId);

      const item: Extract<CandidateProjectionItem, { kind: 'resume_profile' }> = {
        ...header,
        kind: 'resume_profile',
        inputs: {
          profile: await encryptProfile(base()),
          visibility: 'standard',
          enrichment: {
            context,
            envelope: await api.encryptApplication(
              access.vaultPublicKey,
              1,
              {
                ...base(),
                linkedIn,
                website: 'example.com',
                phone: '+777',
                currentTitle: 'Engineer',
                currentCompany: 'Company',
              },
              context,
            ),
          },
        },
      };

      const output = await processCandidateProjection(api, orgId, access, item);

      expect(output.result.kind).toBe('profile_merge');

      if (output.result.kind !== 'profile_merge') {
        throw new Error('Missing resume merge');
      }

      expect(
        await api.decryptApplication(output.result.profile, orgId, access, candidateProfileContext(orgId, candidateId)),
      ).toMatchObject({
        linkedIn: null,
        website: 'https://example.com/',
        phone: '+777',
        currentTitle: 'Engineer',
        currentCompany: 'Company',
      });
    },
  );

  it('projects reporting with the existing namespace and custom values with their field AAD', async () => {
    const form = await formItem();

    const snapshot = structuredClone(form.inputs.snapshot);

    snapshot.sections[0].questions[0] = {
      ...snapshot.sections[0].questions[0],
      questionType: 'multiple_choice',
      config: null,
      reusableField: { fieldId: questionId, valueKind: 'option' },
    };

    if (!form.inputs.answers) {
      throw new Error('Missing test answers');
    }

    const answers = {
      context: form.inputs.answers.context,
      envelope: await api.encryptApplication(
        access.vaultPublicKey,
        1,
        { [questionId]: 'yes' },
        form.inputs.answers.context,
      ),
    };

    const reporting = await processCandidateProjection(api, orgId, access, {
      ...header,
      kind: 'form_reporting',
      inputs: { snapshot, answers },
    });

    expect(reporting.result).toEqual({
      kind: 'form_reporting',
      fieldValues: [
        {
          questionId,
          reusableFieldId: questionId,
          ordinal: 0,
          kind: 'digest',
          value: hashCategoricalFormFieldValue(searchKey, orgId, questionId, 'option', 'yes'),
        },
      ],
    });

    const customClaim = candidateProjectionClaimResponseSchema.parse({
      items: [
        {
          ...header,
          kind: 'form_custom_field',
          expectedTargetFingerprint: 'a'.repeat(64),
          inputs: {
            snapshot,
            answers,
            connector: {
              id: questionId,
              questionId,
              sourceType: 'multiple_choice',
              fieldId: questionId,
              fieldType: 'multiple_choice',
              optionMapping: null,
              unmappedFallback: null,
            },
          },
        },
      ],
      hasMore: false,
      retryAfterMs: 15000,
    });

    const custom = await processCandidateProjection(api, orgId, access, customClaim.items[0]);

    expect(custom.expectedTargetFingerprint).toBe('a'.repeat(64));

    if (custom.result.kind !== 'form_custom_field') {
      throw new Error('Missing custom field');
    }

    expect(custom.result.valueHash).toBe(hashCustomFieldValue(searchKey, orgId, questionId, 'multiple_choice', 'yes'));

    expect(
      await decryptApplicationWithVaultKey(custom.result.encryptedValue, TEST_KEYS.alice.privateKey, {
        purpose: 'custom_field_value',
        orgId,
        subjectId: candidateId,
        fieldId: questionId,
      }),
    ).toBe('yes');
  });
});

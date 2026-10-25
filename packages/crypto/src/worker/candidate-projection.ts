import { z } from 'zod';
import {
  CANDIDATE_PROFILE_MAPPINGS,
  type CandidateProfileValues,
  candidateLocationValueSchema,
  candidateProfileSchema,
  mergeCandidateProfile,
  normalizeCandidateProfileUrl,
  profileMappingError,
  projectCandidateProfileSearch,
} from '../candidate-profile';
import {
  type CandidateProjectionItem,
  type CandidateProjectionOutput,
  type CandidateProjectionResult,
  type ProjectionSnapshot,
  projectionResultHeader,
} from '../candidate-projections';
import { candidateProfileContext, customFieldValueContext } from '../context';
import { isSearchableCustomFieldType } from '../custom-field-search';
import { isEmptyFormAnswer, projectConnectorAnswer, projectSubmissionFieldValues } from '../form-projections';
import type { VaultKeyAccess } from '../schemas/vault-key';
import type { CryptoWorkerApi } from './crypto-api';

type CryptoOperations = Pick<
  CryptoWorkerApi,
  | 'decryptApplication'
  | 'encryptApplication'
  | 'hashCandidateProfileSearchValue'
  | 'hashCategoricalFormFieldValue'
  | 'hashCustomFieldValue'
>;

type EncryptedInput = NonNullable<Extract<CandidateProjectionItem, { kind: 'profile_search' }>['inputs']['profile']>;
class UnreadableInput extends Error {}

/**
 * Called only inside the existing key-owning Worker. Its output contains no profile/answer plaintext.
 */
export async function processCandidateProjection(
  api: CryptoOperations,
  orgId: string,
  access: VaultKeyAccess,
  item: CandidateProjectionItem,
): Promise<CandidateProjectionResult> {
  try {
    return { ...projectionResultHeader(item), result: await project(api, orgId, access, item) };
  } catch (error) {
    return {
      ...projectionResultHeader(item),
      result: {
        kind: 'retryable_error',
        code: error instanceof UnreadableInput || error instanceof z.ZodError ? 'INPUT_UNREADABLE' : 'WORKER_ERROR',
      },
    };
  }
}

async function read(
  api: CryptoOperations,
  orgId: string,
  access: VaultKeyAccess,
  input: EncryptedInput | null,
): Promise<Record<string, unknown>> {
  if (!input || input.context.orgId !== orgId) {
    throw new UnreadableInput();
  }

  try {
    return z
      .record(z.string(), z.unknown())
      .parse(await api.decryptApplication(input.envelope, orgId, access, input.context));
  } catch {
    throw new UnreadableInput();
  }
}

async function project(
  api: CryptoOperations,
  orgId: string,
  access: VaultKeyAccess,
  item: CandidateProjectionItem,
): Promise<CandidateProjectionOutput> {
  if (item.kind === 'resume_profile' && item.inputs.visibility === 'private') {
    return { kind: 'policy_skipped' };
  }

  if (item.kind === 'profile_search') {
    const profile = candidateProfileSchema.parse(await read(api, orgId, access, item.inputs.profile));

    return {
      kind: 'profile_search',
      searchProjection: await projectCandidateProfileSearch(profile, (field, value) =>
        api.hashCandidateProfileSearchValue(orgId, access, field, value),
      ),
    };
  }

  if (item.kind === 'resume_profile' || item.kind === 'form_profile') {
    const current = candidateProfileSchema.parse(await read(api, orgId, access, item.inputs.profile));
    let values: Partial<CandidateProfileValues>;

    if (item.kind === 'resume_profile') {
      const enrichment = candidateProfileSchema.parse(await read(api, orgId, access, item.inputs.enrichment));
      const { manuallyClearedFields: _, ...extracted } = enrichment;

      for (const field of ['linkedIn', 'github', 'website'] as const) {
        try {
          extracted[field] = normalizeCandidateProfileUrl(extracted[field]);
        } catch {
          extracted[field] = null;
        }
      }

      values = extracted;
    } else {
      const answers = item.inputs.answers ? await read(api, orgId, access, item.inputs.answers) : {};

      for (const identity of item.inputs.identityInputs) {
        answers[identity.questionId] = (await read(api, orgId, access, identity)).value;
      }

      values = mappedProfileValues(item.inputs.snapshot, answers);
    }

    const profile = mergeCandidateProfile(current, values);

    if (JSON.stringify(profile) === JSON.stringify(current)) {
      return { kind: 'no_change' };
    }

    return {
      kind: 'profile_merge',
      profile: await api.encryptApplication(
        access.vaultPublicKey,
        access.vaultKeyVersion,
        profile,
        candidateProfileContext(orgId, item.candidateId),
      ),
      searchProjection: await projectCandidateProfileSearch(profile, (field, value) =>
        api.hashCandidateProfileSearchValue(orgId, access, field, value),
      ),
    };
  }

  const answers = item.inputs.answers ? await read(api, orgId, access, item.inputs.answers) : {};

  if (item.kind === 'form_reporting') {
    const visibility = item.source.visibility;
    const isPrivateBucket = visibility === 'private';

    for (const question of item.inputs.snapshot.sections.flatMap((section) => section.questions)) {
      const matchesVisibility = question.visibility === visibility && question.isPrivate === isPrivateBucket;

      if (!matchesVisibility) {
        throw new UnreadableInput();
      }

      const answer = answers[question.id];

      if (question.reusableField && question.isRequired && isEmptyFormAnswer(answer)) {
        throw new UnreadableInput();
      }
    }

    const fieldValues = await projectSubmissionFieldValues(item.inputs.snapshot, answers, (fieldId, kind, value) =>
      api.hashCategoricalFormFieldValue(orgId, access, fieldId, kind, value),
    );

    return { kind: 'form_reporting', fieldValues };
  }

  const connector = item.inputs.connector;
  const value = projectConnectorAnswer(
    answers[connector.questionId],
    connector.sourceType,
    connector.fieldType,
    connector.optionMapping,
    connector.unmappedFallback,
  );

  if (value === null) {
    return { kind: 'no_change' };
  }

  const encryptedValue = await api.encryptApplication(
    access.vaultPublicKey,
    access.vaultKeyVersion,
    value,
    customFieldValueContext(orgId, item.candidateId, connector.fieldId),
  );

  const valueHash = isSearchableCustomFieldType(connector.fieldType)
    ? await api.hashCustomFieldValue(orgId, access, connector.fieldId, connector.fieldType, value)
    : undefined;

  return { kind: 'form_custom_field', encryptedValue, ...(valueHash ? { valueHash } : {}) };
}

function mappedProfileValues(
  snapshot: ProjectionSnapshot,
  answers: Record<string, unknown>,
): Partial<CandidateProfileValues> {
  if (snapshot.formClass !== 'application') {
    throw new UnreadableInput();
  }

  const values: Partial<CandidateProfileValues> = {};
  const seen = new Set<string>();

  for (const question of snapshot.sections.flatMap((section) => section.questions)) {
    if (question.visibility !== 'standard' || question.isPrivate || profileMappingError(question, snapshot.formClass)) {
      throw new UnreadableInput();
    }

    const mapping = question.config?.candidateProfileField;

    if (mapping) {
      if (seen.has(mapping)) {
        throw new UnreadableInput();
      }

      seen.add(mapping);
    }

    const answer = answers[question.id];

    if (answer === undefined || answer === null || answer === '') {
      continue;
    }

    if (question.questionType === 'candidate_location') {
      values.location = candidateLocationValueSchema.parse(answer);
    } else if (mapping) {
      values[CANDIDATE_PROFILE_MAPPINGS[mapping].profileField] = z.string().parse(answer);
    } else if (question.isLocked && question.questionType === 'email') {
      values.email = z.email().parse(answer);
    }
  }

  return values;
}

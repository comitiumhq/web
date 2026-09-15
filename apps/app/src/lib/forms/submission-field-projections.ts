import { CryptoProxy } from '@comitium/crypto';
import type { WrappedKey } from '@comitium/schemas/common';
import type { FormDefinitionSnapshot, FormSubmissionFieldProjection } from '@comitium/schemas/forms/form-submission';
import {
  extractSubmissionFieldProjectionSources,
  type SubmissionFieldProjectionSource,
} from '@comitium/schemas/forms/submission-field-values';

export async function projectSubmissionFieldValues(
  orgId: string,
  wrappedVaultKey: WrappedKey,
  form: FormDefinitionSnapshot,
  answers: Record<string, unknown>,
): Promise<FormSubmissionFieldProjection[]> {
  const sources = extractSubmissionFieldProjectionSources(form, answers);

  return Promise.all(sources.map((source) => projectFieldValue(orgId, wrappedVaultKey, source)));
}

async function projectFieldValue(
  orgId: string,
  wrappedVaultKey: WrappedKey,
  source: SubmissionFieldProjectionSource,
): Promise<FormSubmissionFieldProjection> {
  const identity = {
    questionId: source.questionId,
    reusableFieldId: source.reusableFieldId,
    ordinal: source.ordinal,
  };

  switch (source.kind) {
    case 'boolean':
    case 'option':
      return {
        ...identity,
        kind: 'digest',
        value: await CryptoProxy.hashCategoricalFormFieldValue(
          orgId,
          wrappedVaultKey,
          source.reusableFieldId,
          source.kind,
          source.value,
        ),
      };
    case 'number':
    case 'timestamp':
      return { ...identity, kind: source.kind, value: source.value };
  }
}

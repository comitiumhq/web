import { CryptoProxy, type VaultKeyAccess } from '@comitium/crypto';
import { projectSubmissionFieldValues as projectFieldValues } from '@comitium/crypto/form-projections';
import type { FormDefinitionSnapshot } from '@comitium/schemas/forms/form-submission';

export function projectSubmissionFieldValues(
  orgId: string,
  vaultAccess: VaultKeyAccess,
  form: FormDefinitionSnapshot,
  answers: Record<string, unknown>,
) {
  return projectFieldValues(form, answers, (fieldId, kind, value) =>
    CryptoProxy.hashCategoricalFormFieldValue(orgId, vaultAccess, fieldId, kind, value),
  );
}

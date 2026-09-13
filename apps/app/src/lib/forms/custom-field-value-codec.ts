import { CryptoProxy, isSearchableCustomFieldType, type PublicEncryptionKey } from '@comitium/crypto';
import { customFieldValueContext } from '@comitium/crypto/context';
import type { WrappedKey } from '@comitium/schemas/common';
import type { FieldTypeId } from '@comitium/schemas/forms';

interface EncodeCandidateCustomFieldValueParams {
  orgId: string;
  candidateId: string;
  fieldId: string;
  fieldType: FieldTypeId;
  value: unknown;
  vaultPublicKey: PublicEncryptionKey;
  vaultKeyVersion: number;
  wrappedVaultKey: WrappedKey;
}

export async function encodeCandidateCustomFieldValue({
  orgId,
  candidateId,
  fieldId,
  fieldType,
  value,
  vaultPublicKey,
  vaultKeyVersion,
  wrappedVaultKey,
}: EncodeCandidateCustomFieldValueParams) {
  const encryptedValue = await CryptoProxy.encryptApplication(
    vaultPublicKey,
    vaultKeyVersion,
    value,
    customFieldValueContext(orgId, candidateId, fieldId),
  );

  const valueHash = isSearchableCustomFieldType(fieldType)
    ? await CryptoProxy.hashCustomFieldValue(orgId, wrappedVaultKey, fieldId, fieldType, value)
    : undefined;

  return { encryptedValue, valueHash };
}

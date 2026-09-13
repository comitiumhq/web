import { createBlindIndexDigest, createUuidScopeSalt } from './blind-index';
import { normalizeCustomFieldValue, type SearchableCustomFieldType } from './custom-field-search';

// Wire-frozen: changing this namespace invalidates stored custom-field digests.
const CUSTOM_FIELD_HASH_NAMESPACE = 'comitium-custom-field-hash-v1';

export function hashCustomFieldValue(
  vaultPrivateKey: Uint8Array,
  orgId: string,
  fieldId: string,
  fieldType: SearchableCustomFieldType,
  plaintext: unknown,
): string {
  const normalizedValue = normalizeCustomFieldValue(plaintext, fieldType);

  return createBlindIndexDigest(
    vaultPrivateKey,
    createUuidScopeSalt(orgId, fieldId),
    `${CUSTOM_FIELD_HASH_NAMESPACE}:${fieldType}`,
    normalizedValue,
  );
}

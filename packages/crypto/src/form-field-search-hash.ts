import { createBlindIndexDigest, createUuidScopeSalt } from './blind-index';

// Wire-frozen: changing this namespace invalidates stored reusable-field digests.
const FORM_FIELD_SEARCH_HASH_NAMESPACE = 'comitium-search-projection-hash-v1:form-field';

export type CategoricalFormFieldKind = 'boolean' | 'option';

export function hashCategoricalFormFieldValue(
  vaultPrivateKey: Uint8Array,
  orgId: string,
  fieldId: string,
  kind: CategoricalFormFieldKind,
  value: boolean | string,
): string {
  return createBlindIndexDigest(
    vaultPrivateKey,
    createUuidScopeSalt(orgId, fieldId),
    `${FORM_FIELD_SEARCH_HASH_NAMESPACE}:${kind}`,
    String(value),
  );
}

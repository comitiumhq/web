/**
 * Primary public API — all crypto goes through CryptoProxy
 */

export type { CandidateProfileSearchField } from './candidate-profile-search-hash';

export { isSearchableCustomFieldType, type SearchableCustomFieldType } from './custom-field-search';

export type { CategoricalFormFieldKind } from './form-field-search-hash';

export { CryptoProxy } from './proxy';

export { applicantRecipient, orgVaultRecipient, processorRecipient } from './recipients';

export type { EncryptedEnvelope, EnvelopeKey, PublicEncryptionKey } from './schemas';

export { type WrappedKey, wrappedKeySchema } from './schemas/keys';

export { type WrappedUserKey, wrappedUserKeySchema } from './schemas/user-key';

export type { VaultKeyAccess, VaultKeyContext, WrappedSearchKey } from './schemas/vault-key';

export { vaultKeyAccessSchema, wrappedSearchKeySchema } from './schemas/vault-key';

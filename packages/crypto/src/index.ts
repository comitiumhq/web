// Primary public API — all crypto goes through CryptoProxy

export { type WrappedKey, wrappedKeySchema } from './envelope-key';
export { type WrappedPersonalKey, wrappedPersonalKeySchema } from './personal-key';
export { CryptoProxy } from './proxy';
export { applicantRecipient, orgVaultRecipient, processorRecipient } from './recipients';
export type { EncryptedEnvelope, EnvelopeKey, PublicEncryptionKey } from './schemas';

export const SHA256_FINGERPRINT_REGEX = /^[a-f0-9]{64}$/;
export const X25519_PUBLIC_KEY_HEX_REGEX = /^[a-fA-F0-9]{64}$/;
export const PROCESSOR_RECIPIENT_REGEX = /^processor:[^\s:]+$/;
export const RECOVERY_CODE_GROUP_REGEX = /(.{4})(?=.)/g;
export const RECOVERY_CODE_SEPARATOR_REGEX = /[\s-]/g;
export const WHITESPACE_RUN_REGEX = /\s+/g;
export const TRAILING_SLASH_REGEX = /\/$/;
export const PASSPHRASE_WORD_REGEX = /^[a-z]{4,10}$/;

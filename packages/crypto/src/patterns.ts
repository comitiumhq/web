export const SHA256_FINGERPRINT_REGEX = /^[a-f0-9]{64}$/;
export const HEX_32_BYTES_REGEX = /^[a-fA-F0-9]{64}$/;
export const X25519_PUBLIC_KEY_HEX_REGEX = HEX_32_BYTES_REGEX;
export const HMAC_SHA256_HEX_REGEX = HEX_32_BYTES_REGEX;
export const PROCESSOR_RECIPIENT_REGEX = /^processor:[^\s:]+$/;
export const RECOVERY_CODE_GROUP_REGEX = /(.{4})(?=.)/g;
export const RECOVERY_CODE_SEPARATOR_REGEX = /[\s-]/g;
export const WHITESPACE_RUN_REGEX = /\s+/g;
export const TRAILING_SLASH_REGEX = /\/$/;
export const URL_SCHEME_REGEX = /^[a-z][a-z\d+.-]*:/i;
export const HTTPS_URL_PROTOCOL_REGEX = /^https$/;
export const HTTPS_URL_HOSTNAME_REGEX =
  /^(?!localhost$)(?!.*\.localhost$)(?!127(?:\.\d{1,3}){3}$)(?!0\.0\.0\.0$)(?!\[::1\]$).+$/i;

export const UNSIGNED_BIGINT_DECIMAL_REGEX = /^(0|[1-9][0-9]{0,18})$/;
export const SEARCH_WORD_REGEX = /[\p{L}\p{M}\p{N}]+/gu;
export const SEARCH_WHITESPACE_REGEX = /\s+/u;

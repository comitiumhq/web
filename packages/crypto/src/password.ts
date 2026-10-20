import { ZxcvbnFactory } from '@zxcvbn-ts/core';
import * as common from '@zxcvbn-ts/language-common';
import * as english from '@zxcvbn-ts/language-en';

const MAX_PASSWORD_BYTES = 1024;
const MIN_PASSWORD_LENGTH = 12;
const MIN_PASSWORD_SCORE = 3;

const PASSWORD_ERRORS = {
  'too-long': `Storage password exceeds ${MAX_PASSWORD_BYTES} UTF-8 bytes`,
  'too-short': `Storage password must contain at least ${MIN_PASSWORD_LENGTH} characters`,
  'too-weak': 'Storage password is too easy to guess',
};

interface PasswordStrength {
  score: number;
  error: keyof typeof PASSWORD_ERRORS | null;
}

let estimator: ZxcvbnFactory | undefined;

/**
 * Deliberately no trim, case-folding or Unicode normalization.
 */
export function encodePassword(password: string): Uint8Array {
  const bytes = new TextEncoder().encode(password);

  if (bytes.length > MAX_PASSWORD_BYTES) {
    bytes.fill(0);

    throw new Error(PASSWORD_ERRORS['too-long']);
  }

  return bytes;
}

export function getPasswordStrength(password: string): PasswordStrength {
  const bytes = new TextEncoder().encode(password);
  const tooLong = bytes.length > MAX_PASSWORD_BYTES;
  bytes.fill(0);

  if (tooLong) {
    return { score: 0, error: 'too-long' };
  }

  estimator ??= new ZxcvbnFactory({
    dictionary: { ...common.dictionary, ...english.dictionary },
    graphs: common.adjacencyGraphs,
    translations: english.translations,
  });

  const score = estimator.check(password).score;

  if (Array.from(password).length < MIN_PASSWORD_LENGTH) {
    return { score, error: 'too-short' };
  }

  return { score, error: score < MIN_PASSWORD_SCORE ? 'too-weak' : null };
}

export function assertNewStoragePassword(password: string): void {
  const { error } = getPasswordStrength(password);

  if (error) {
    throw new Error(PASSWORD_ERRORS[error]);
  }
}

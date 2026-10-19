import { ZxcvbnFactory } from '@zxcvbn-ts/core';
import * as common from '@zxcvbn-ts/language-common';
import * as english from '@zxcvbn-ts/language-en';
import { PASSPHRASE_WORD_REGEX } from './patterns';

const MAX_PASSWORD_BYTES = 1024;
const MIN_PASSWORD_LENGTH = 12;
const MIN_PASSWORD_SCORE = 3;
const PASSPHRASE_LENGTH = 6;
const PASSPHRASE_DICTIONARY_SIZE = 8192;

const eligibleWords = english.dictionary['wikipedia-en'].filter((word) => PASSPHRASE_WORD_REGEX.test(word));
const passphraseWords = Array.from(new Set(eligibleWords)).slice(0, PASSPHRASE_DICTIONARY_SIZE);

/**
 * Six uniform selections from 8192 words provide 78 bits of entropy.
 */
export function generateStoragePassword(): string {
  if (passphraseWords.length !== PASSPHRASE_DICTIONARY_SIZE) {
    throw new Error('Passphrase vocabulary is incomplete');
  }

  const randomValues = crypto.getRandomValues(new Uint16Array(PASSPHRASE_LENGTH));
  const words = Array.from(randomValues, (value) => passphraseWords[value % PASSPHRASE_DICTIONARY_SIZE]);

  randomValues.fill(0);

  return words.join(' ');
}

/**
 * Deliberately no trim, case-folding or Unicode normalization.
 */
export function encodePassword(password: string): Uint8Array {
  const bytes = new TextEncoder().encode(password);

  if (bytes.length > MAX_PASSWORD_BYTES) {
    bytes.fill(0);

    throw new Error(`Storage password exceeds ${MAX_PASSWORD_BYTES} UTF-8 bytes`);
  }

  return bytes;
}

export function assertNewStoragePassword(password: string): void {
  const bytes = encodePassword(password);

  bytes.fill(0);

  if (Array.from(password).length < MIN_PASSWORD_LENGTH) {
    throw new Error(`Storage password must contain at least ${MIN_PASSWORD_LENGTH} characters`);
  }

  const estimator = new ZxcvbnFactory({
    dictionary: { ...common.dictionary, ...english.dictionary },
    graphs: common.adjacencyGraphs,
    translations: english.translations,
  });

  if (estimator.check(password).score < MIN_PASSWORD_SCORE) {
    throw new Error('Storage password is too easy to guess');
  }
}

import { ZxcvbnFactory } from '@zxcvbn-ts/core';
import * as common from '@zxcvbn-ts/language-common';
import * as english from '@zxcvbn-ts/language-en';

const MAX_PASSWORD_BYTES = 1024;

/**
 * Deliberately no trim, case-folding or Unicode normalization.
 */
export function encodePassword(password: string): Uint8Array {
  const bytes = new TextEncoder().encode(password);

  if (bytes.length > MAX_PASSWORD_BYTES) {
    bytes.fill(0);

    throw new Error('Storage password exceeds 1024 UTF-8 bytes');
  }

  return bytes;
}

export async function assertNewStoragePassword(password: string): Promise<void> {
  const bytes = encodePassword(password);

  bytes.fill(0);

  if (Array.from(password).length < 12) {
    throw new Error('Storage password must contain at least 12 characters');
  }

  const estimator = new ZxcvbnFactory({
    dictionary: { ...common.dictionary, ...english.dictionary },
    graphs: common.adjacencyGraphs,
    translations: english.translations,
  });

  if (estimator.check(password).score < 3) {
    throw new Error('Storage password is too easy to guess');
  }
}

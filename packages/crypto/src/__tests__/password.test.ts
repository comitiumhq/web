import { describe, expect, it } from 'vitest';
import { assertNewStoragePassword, generateStoragePassword } from '../password';

describe('generated storage passwords', () => {
  it('generates a six-word phrase accepted by the storage-password policy', () => {
    const phrase = generateStoragePassword();

    expect(phrase.split(' ')).toHaveLength(6);
    expect(() => assertNewStoragePassword(phrase)).not.toThrow();
  });
});

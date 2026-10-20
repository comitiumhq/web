import { describe, expect, it } from 'vitest';
import { assertNewStoragePassword, getPasswordStrength } from '../password';

describe('password strength policy', () => {
  it('rejects a predictable password even when it meets the length requirement', () => {
    const password = 'password123456';

    expect(getPasswordStrength(password).error).toBe('too-weak');
    expect(() => assertNewStoragePassword(password)).toThrow('too easy to guess');
  });

  it('accepts a strong password with the same policy used for key creation', () => {
    const password = 'G6v!m2Qr9#tL8sZ4';
    const strength = getPasswordStrength(password);

    expect(strength.score).toBe(4);
    expect(strength.error).toBeNull();
    expect(() => assertNewStoragePassword(password)).not.toThrow();
  });

  it('keeps the length requirement even for a hard-to-guess short password', () => {
    const password = 'jG7!zQ2@xW9';

    expect(getPasswordStrength(password).error).toBe('too-short');
    expect(() => assertNewStoragePassword(password)).toThrow('at least 12 characters');
  });

  it('rejects excessive UTF-8 bytes before estimating strength', () => {
    const password = 'é'.repeat(513);

    expect(getPasswordStrength(password)).toEqual({ score: 0, error: 'too-long' });
    expect(() => assertNewStoragePassword(password)).toThrow('1024 UTF-8 bytes');
  });
});

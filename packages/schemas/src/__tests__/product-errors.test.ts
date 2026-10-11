import { describe, expect, it } from 'vitest';

import { ApplicationRequestError, EncryptionError, isJobError, ValidationError, VaultError } from '../product-errors';

describe('types', () => {
  describe('isJobError', () => {
    it('returns true for all error classes', () => {
      expect(isJobError(new VaultError('op', null))).toBe(true);
      expect(isJobError(new ValidationError('field', 'reason'))).toBe(true);
      expect(isJobError(new EncryptionError('encrypt_data', null))).toBe(true);
      expect(isJobError(new ApplicationRequestError(400, 'msg'))).toBe(true);
    });

    it('returns false for plain Error', () => {
      expect(isJobError(new Error('generic'))).toBe(false);
    });

    it('returns false for non-Error values', () => {
      expect(isJobError(null)).toBe(false);
      expect(isJobError(undefined)).toBe(false);
      expect(isJobError('string')).toBe(false);
      expect(isJobError(42)).toBe(false);
      expect(isJobError({ _tag: 'VaultError' })).toBe(false);
    });
  });
});

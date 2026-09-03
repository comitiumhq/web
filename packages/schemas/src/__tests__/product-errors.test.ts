import { describe, expect, it } from 'vitest';

import {
  ContractError,
  EncryptionError,
  isJobError,
  SignatureError,
  TransactionError,
  ValidationError,
} from '../product-errors';

describe('types', () => {
  describe('isJobError', () => {
    it('returns true for all error classes', () => {
      expect(isJobError(new ContractError('op', null))).toBe(true);
      expect(isJobError(new ValidationError('field', 'reason'))).toBe(true);
      expect(isJobError(new EncryptionError('encrypt_data', null))).toBe(true);
      expect(isJobError(new SignatureError(400, 'msg'))).toBe(true);
      expect(isJobError(new TransactionError('op', null))).toBe(true);
    });

    it('returns false for plain Error', () => {
      expect(isJobError(new Error('generic'))).toBe(false);
    });

    it('returns false for non-Error values', () => {
      expect(isJobError(null)).toBe(false);
      expect(isJobError(undefined)).toBe(false);
      expect(isJobError('string')).toBe(false);
      expect(isJobError(42)).toBe(false);
      expect(isJobError({ _tag: 'ContractError' })).toBe(false);
    });
  });

  describe('TransactionError', () => {
    it('extracts shortMessage from viem BaseError', () => {
      const viemError = new Error('full message');
      (viemError as unknown as Record<string, unknown>).shortMessage = 'User denied transaction signature';

      const err = new TransactionError('apply', viemError);

      expect(err.message).toContain('User denied transaction signature');
    });

    it('handles plain object with code and message', () => {
      const rpcError = { code: 4001, message: 'User rejected' };
      const err = new TransactionError('apply', rpcError);

      expect(err.message).toContain('User rejected');
    });

    it('handles string cause', () => {
      const err = new TransactionError('apply', 'something went wrong');

      expect(err.message).toContain('something went wrong');
    });

    it('handles Error without shortMessage', () => {
      const err = new TransactionError('createJob', new Error('gas estimation failed'));

      expect(err.message).toContain('gas estimation failed');
    });
  });
});

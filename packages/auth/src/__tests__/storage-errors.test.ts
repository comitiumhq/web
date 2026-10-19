import { ApiError } from '@comitium/schemas/api-errors';
import { describe, expect, it } from 'vitest';
import { storageErrorMessage } from '../storage/storage-errors';

describe('storage error messages', () => {
  it('does not suggest recovery for network or unexpected failures', () => {
    expect(storageErrorMessage(new TypeError('Network failed'))).toContain('connection');
    expect(storageErrorMessage(new Error('Internal failure'))).not.toMatch(/password|recovery/i);
    expect(storageErrorMessage(new Error('Internal failure'))).not.toContain('Internal failure');
  });

  it('recognizes decryption failure after Comlink preserves only the error name', () => {
    const error = Object.assign(new Error('Internal decryption details'), { name: 'OperationError' });

    expect(storageErrorMessage(error)).toContain('Could not decrypt');
    expect(storageErrorMessage(error)).not.toContain(error.message);
  });

  it('does not display a failure when sign-in confirmation is cancelled', () => {
    expect(storageErrorMessage(new DOMException('Cancelled', 'AbortError'))).toBeNull();
  });

  it('preserves authentication expiry from the main-thread auth client', () => {
    expect(storageErrorMessage(new ApiError(401, 'Private details'))).toContain('Sign in again');
  });
});

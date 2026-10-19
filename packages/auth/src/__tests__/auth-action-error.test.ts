import { ApiError } from '@comitium/schemas/api-errors';
import { describe, expect, it } from 'vitest';
import { getAuthActionError } from '../auth-action-error';

describe('safe authentication errors', () => {
  it.each(['send-code', 'verify-code', 'google', 'passkey'] as const)('handles rate limiting for %s', (operation) => {
    expect(getAuthActionError(new ApiError(429, 'Private rate-limit details'), operation)).toBe(
      'Too many requests. Please try again later.',
    );
  });

  it.each(['send-code', 'verify-code', 'google', 'passkey'] as const)(
    'never reflects unknown provider messages for %s',
    (operation) => {
      const error = new ApiError(500, 'Private provider details', 'untrusted-provider-value');

      expect(getAuthActionError(error, operation)).not.toMatch(/Private|untrusted-provider/);
      expect(getAuthActionError('untrusted-url-value', operation)).not.toContain('untrusted-url-value');
    },
  );
});

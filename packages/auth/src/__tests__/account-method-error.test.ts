import { describe, expect, it } from 'vitest';

import { getAccountMethodError } from '../account-settings/account-method-error';

describe('getAccountMethodError', () => {
  it('renders explicit occupied-account conflicts without offering transfer', () => {
    const conflict = { privyErrorCode: 'linked_to_another_user' };

    expect(getAccountMethodError(conflict, 'verify-email')).toBe(
      'This email is already used by another Comitium account.',
    );
    expect(getAccountMethodError('linked_to_another_user', 'link-google')).toBe(
      'This Google account is already used by another Comitium account.',
    );
  });

  it('describes the failed user action without exposing provider details', () => {
    const providerError = new Error('provider infrastructure details');

    expect(getAccountMethodError(providerError, 'send-email-code')).toBe(
      'We could not send a verification code. Try again.',
    );
    expect(getAccountMethodError(providerError, 'verify-email')).toBe('We could not verify this email. Try again.');
    expect(getAccountMethodError({ privyErrorCode: 500 }, 'link-google')).toBe(
      'We could not add this Google account. Try again.',
    );
    expect(getAccountMethodError(null, 'link-google')).toBe('We could not add this Google account. Try again.');
  });
});

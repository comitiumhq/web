import { ApiError } from '@comitium/schemas/api-errors';

type AuthOperation = 'send-code' | 'verify-code' | 'google' | 'passkey';

export function getAuthActionError(error: unknown, operation: AuthOperation): string {
  const code = error instanceof ApiError ? error.code : error;

  if (error instanceof ApiError && error.status === 429) {
    return 'Too many requests. Please try again later.';
  }

  if (code === 'ACCOUNT_SWITCH_NOT_ALLOWED') {
    return 'Sign out before switching accounts.';
  }

  if (operation === 'send-code') {
    return code === 'INVALID_EMAIL'
      ? 'Enter a valid email address.'
      : 'We couldn’t request a verification code. Try again.';
  }

  if (operation === 'verify-code') {
    switch (code) {
      case 'INVALID_OTP':
        return 'This code is incorrect or no longer valid. Use the latest code.';
      case 'OTP_EXPIRED':
        return 'This code has expired. Request a new code.';
      case 'TOO_MANY_ATTEMPTS':
        return 'Too many incorrect attempts. Request a new code.';
      default:
        return 'We couldn’t complete sign-in. Try again.';
    }
  }

  if (operation === 'google') {
    switch (code) {
      case 'access_denied':
      case 'USER_CANCELLED':
        return 'Google sign-in wasn’t completed. Try again or continue with email.';
      case 'GOOGLE_EMAIL_NOT_VERIFIED':
        return 'Google could not confirm your email address. Continue with email.';
      case 'temporarily_unavailable':
        return 'Google sign-in is unavailable. Continue with email or try again later.';
      default:
        return 'We couldn’t complete Google sign-in. Please start again.';
    }
  }

  switch (code) {
    case 'AUTH_CANCELLED':
    case 'ERROR_CEREMONY_ABORTED':
    case 'ERROR_PASSTHROUGH_SEE_CAUSE_PROPERTY':
      return 'Passkey sign-in wasn’t completed. Try again, or continue with email.';
    case 'PASSKEY_NOT_SUPPORTED':
      return 'Passkeys aren’t supported in this browser. Continue with email.';
    case 'CHALLENGE_NOT_FOUND':
      return 'This sign-in request expired. Try again.';
    case 'PASSKEY_NOT_FOUND':
      return 'We couldn’t sign you in with this passkey. Continue with email.';
    case 'AUTHENTICATION_FAILED':
      return 'We couldn’t verify this passkey. Try again, or continue with email.';
    default:
      return 'We couldn’t complete sign-in. Try again.';
  }
}

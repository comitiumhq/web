import { ApiError } from '@comitium/schemas/api-errors';

type AccountMethodOperation = 'link-google' | 'unlink-google' | 'send-email-code' | 'verify-email';

const ACCOUNT_CONFLICT_CODES = new Set([
  'account_already_linked_to_different_user',
  'SOCIAL_ACCOUNT_ALREADY_LINKED',
  'USER_ALREADY_EXISTS',
  'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL',
]);

const operationErrorMessages: Record<AccountMethodOperation, string> = {
  'link-google': 'We could not add this Google account. Try again.',
  'unlink-google': 'We could not remove Google. Try again.',
  'send-email-code': 'We could not send a verification code. Try again.',
  'verify-email': 'We could not verify this email. Try again.',
};

export function getAccountMethodError(error: unknown, operation: AccountMethodOperation): string | null {
  if (error instanceof Error && error.name === 'AbortError') {
    return null;
  }

  const code = error instanceof ApiError ? error.code : error;

  if (typeof code === 'string' && ACCOUNT_CONFLICT_CODES.has(code)) {
    if (operation === 'link-google') {
      return 'This Google account is already used by another Comitium account.';
    }

    return 'This email is already used by another Comitium account.';
  }

  return operationErrorMessages[operation];
}

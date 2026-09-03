import { z } from 'zod';

type AccountMethodOperation = 'link-google' | 'send-email-code' | 'verify-email';

const LINKED_ACCOUNT_CONFLICT_CODE = 'linked_to_another_user';
const linkedAccountConflictSchema = z.union([
  z.literal(LINKED_ACCOUNT_CONFLICT_CODE),
  z.object({ privyErrorCode: z.literal(LINKED_ACCOUNT_CONFLICT_CODE) }),
]);

const operationErrorMessages: Record<AccountMethodOperation, string> = {
  'link-google': 'We could not add this Google account. Try again.',
  'send-email-code': 'We could not send a verification code. Try again.',
  'verify-email': 'We could not verify this email. Try again.',
};

export function getAccountMethodError(error: unknown, operation: AccountMethodOperation): string {
  if (linkedAccountConflictSchema.safeParse(error).success) {
    if (operation === 'link-google') {
      return 'This Google account is already used by another Comitium account.';
    }

    return 'This email is already used by another Comitium account.';
  }

  return operationErrorMessages[operation];
}

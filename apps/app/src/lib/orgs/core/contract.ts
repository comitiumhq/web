import {
  submitPreparedUserWalletOnchainOperation,
  type UserWalletOperationSubmission,
} from '@comitium/auth/user-wallet-operation';
import { TransactionError } from '@comitium/schemas/product-errors';
import { ResultAsync } from 'neverthrow';
import type { ExecutableOrgCreation } from '@/lib/schemas/org';

export function sendCreateOrgBundle(
  preparation: ExecutableOrgCreation,
): ResultAsync<UserWalletOperationSubmission, TransactionError> {
  return ResultAsync.fromPromise(
    submitPreparedUserWalletOnchainOperation(preparation, { continueUntilSettlement: false }),
    (error) => new TransactionError('sendCreateOrgBundle', error),
  );
}

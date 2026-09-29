import { isJobError, type JobError } from '@comitium/schemas/product-errors';
import { isProductSubmissionUncertain } from '@comitium/schemas/transaction-errors';

export function getProductErrorMessage(error: unknown, fallback: string): string {
  if (!isJobError(error)) {
    return fallback;
  }

  return getCommonErrorMessage(error);
}

export function getCommonErrorMessage(error: JobError): string {
  switch (error._tag) {
    case 'ValidationError':
      return error.reason;

    case 'EncryptionError':
      return 'Failed to encrypt data. Please try again.';

    case 'SignatureError':
      return 'This action could not be prepared. Please try again.';

    case 'TransactionError':
      if (isProductSubmissionUncertain(error)) {
        return 'We could not confirm whether this action was submitted. Check its current status before trying again.';
      }

      if (error.message.includes('rejected')) {
        return 'The request was cancelled';
      }

      return 'Could not submit this action. Please try again.';

    case 'ContractError':
      return 'Could not prepare this action. Please try again.';

    default:
      return 'An unexpected error occurred';
  }
}

import { isJobError, type JobError } from '@comitium/schemas/product-errors';

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

    case 'ApplicationRequestError':
      return 'This action could not be prepared. Please try again.';

    case 'VaultError':
      return 'Could not prepare this action. Please try again.';

    default:
      return 'An unexpected error occurred';
  }
}

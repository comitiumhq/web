import type { UnlockApiErrorCode } from '../schemas/unlock-api';

export class UnlockApiError extends Error {
  readonly name = 'UnlockApiError';

  constructor(
    readonly status: number,
    readonly code: UnlockApiErrorCode = 'API_ERROR',
  ) {
    super(`Encryption API request failed (${status})`);
  }
}

export function isUnlockApiClientError(error: unknown): error is UnlockApiError {
  return error instanceof UnlockApiError && error.status < 500;
}

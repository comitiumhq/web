import { getApiErrorStatus } from './api-errors';

/** 30 seconds — for data that changes frequently, such as team membership. */
export const STALE_TIME_SHORT = 30 * 1000;

/** Five minutes — the default for most queries. */
export const STALE_TIME_DEFAULT = 5 * 60 * 1000;

/** Ten minutes — for data that changes rarely, such as a vault public key. */
export const STALE_TIME_LONG = 10 * 60 * 1000;

export function isUnauthorizedError(error: unknown): boolean {
  return getApiErrorStatus(error) === 401;
}

export function shouldRetryQuery(failureCount: number, error: unknown): boolean {
  const status = getApiErrorStatus(error);

  if (status !== null && status >= 400 && status < 500 && status !== 408 && status !== 429) {
    return false;
  }

  return failureCount < 3;
}

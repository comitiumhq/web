import { ApiError } from '@comitium/schemas/api-errors';

type AuthResult<T> = {
  data: T;
  error: { status: number; code?: string } | null;
};

/**
 * Adapt native auth results without exposing provider messages or response bodies.
 */
export function unwrapAuthResult<T>({ data, error }: AuthResult<T>): T {
  if (error) {
    throw new ApiError(error.status, 'Authentication request failed', error.code);
  }

  return data;
}

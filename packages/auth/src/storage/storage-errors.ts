import { UnlockApiError } from '@comitium/crypto';
import { ApiError } from '@comitium/schemas/api-errors';

const STORAGE_ERROR_MESSAGES = new Map([
  ['Storage password exceeds 1024 UTF-8 bytes', 'Password is too long. Choose a shorter password.'],
  ['Storage password must contain at least 8 characters', 'Use at least 8 characters.'],
  ['Storage password is too easy to guess', 'Choose a stronger password. Avoid common words and patterns.'],
  ['Recovery code is invalid', 'Check your recovery code and try again.'],
  [
    'Remembered device is unavailable',
    'This device cannot open your encrypted data. Use your recovery code or another unlocked device.',
  ],
]);

export function storageErrorMessage(error: unknown): string | null {
  if (error instanceof UnlockApiError || error instanceof ApiError) {
    if (error.status === 401) {
      return 'Your sign-in expired. Sign in again to continue.';
    }

    if (error.code === 'KEY_SHARE_UNAVAILABLE') {
      return 'Password unlock is temporarily unavailable. Use your recovery code or an unlocked device.';
    }

    if (error.status === 409) {
      return 'Your account or encryption keys changed. Reload before trying again.';
    }

    return 'Could not complete the request. Check your connection and try again.';
  }

  if (error instanceof Error || error instanceof DOMException) {
    if (error.name === 'AbortError') {
      return null;
    }

    if (error.name === 'OperationError') {
      return 'Could not decrypt your data. Check your password or recovery code.';
    }

    if (error.name === 'TypeError') {
      return 'Could not connect to Comitium. Check your connection and try again.';
    }
  }

  if (error instanceof Error) {
    const message = STORAGE_ERROR_MESSAGES.get(error.message);

    if (message) {
      return message;
    }
  }

  return 'Could not complete the operation. Please try again.';
}

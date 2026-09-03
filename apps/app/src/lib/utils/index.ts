export { addressesEqual, normalizeAddress } from '@comitium/chain/address';
export { getErrorMessage } from '@comitium/schemas/error';
export { isDefined, isNonNull } from '@comitium/schemas/guards';
export { isClient } from '@comitium/ui/browser';
export { cn } from '@comitium/ui/cn';
export * from '@comitium/ui/date';
export * from '@comitium/ui/display-name';
export { triggerFileDownload } from '@comitium/ui/download';
export * from '@comitium/ui/formatting';
export * from '@comitium/ui/salary';
export { compareBySortOrderThenLabel } from '@comitium/ui/sort';
export { formatUrlForDisplay, isUrl } from '@comitium/ui/url';

export async function withRetry<T>(
  operation: () => Promise<T>,
  options: { maxRetries?: number; initialDelay?: number; shouldRetry?: (error: unknown) => boolean } = {},
): Promise<T> {
  const { maxRetries = 3, initialDelay = 1000, shouldRetry = () => true } = options;
  let lastError: unknown;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (!shouldRetry(error)) {
        throw error;
      }

      if (attempt < maxRetries - 1) {
        await new Promise((resolve) => setTimeout(resolve, initialDelay * 2 ** attempt));
      }
    }
  }

  throw lastError;
}

export function generateId(): string {
  return crypto.randomUUID();
}

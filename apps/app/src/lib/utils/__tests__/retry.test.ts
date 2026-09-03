import { describe, expect, it, vi } from 'vitest';

import { withRetry } from '../index';

describe('withRetry', () => {
  it('returns the first successful result', async () => {
    const operation = vi.fn().mockResolvedValue('ok');

    await expect(withRetry(operation, { initialDelay: 1 })).resolves.toBe('ok');
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('retries until the operation succeeds', async () => {
    const operation = vi
      .fn()
      .mockRejectedValueOnce(new Error('first failure'))
      .mockRejectedValueOnce(new Error('second failure'))
      .mockResolvedValue('ok');

    await expect(withRetry(operation, { maxRetries: 3, initialDelay: 1 })).resolves.toBe('ok');
    expect(operation).toHaveBeenCalledTimes(3);
  });

  it('does not retry an error rejected by the retry policy', async () => {
    const error = new Error('do not retry');
    const operation = vi.fn().mockRejectedValue(error);

    await expect(withRetry(operation, { initialDelay: 1, shouldRetry: () => false })).rejects.toBe(error);
    expect(operation).toHaveBeenCalledTimes(1);
  });
});

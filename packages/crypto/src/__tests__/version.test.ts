import { describe, expect, it } from 'vitest';

import {
  ALGORITHM_SUITE_VERSION,
  assertSupportedAlgorithmSuiteVersion,
  isSupportedAlgorithmSuiteVersion,
  SUPPORTED_ALGORITHM_SUITE_VERSIONS,
} from '../version';

describe('crypto suite version', () => {
  it('exposes exactly the current supported suite version', () => {
    expect(ALGORITHM_SUITE_VERSION).toBe(1);
    expect(SUPPORTED_ALGORITHM_SUITE_VERSIONS).toEqual([1]);
  });

  it('narrows supported versions', () => {
    expect(isSupportedAlgorithmSuiteVersion(1)).toBe(true);
    expect(isSupportedAlgorithmSuiteVersion(0)).toBe(false);
    expect(isSupportedAlgorithmSuiteVersion(2)).toBe(false);
  });

  it('throws for unsupported versions', () => {
    expect(() => assertSupportedAlgorithmSuiteVersion(1)).not.toThrow();
    expect(() => assertSupportedAlgorithmSuiteVersion(2)).toThrow('Unsupported crypto suite version: 2');
  });
});

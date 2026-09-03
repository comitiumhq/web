export const ALGORITHM_SUITE_VERSION = 1 as const;

export const SUPPORTED_ALGORITHM_SUITE_VERSIONS = [ALGORITHM_SUITE_VERSION] as const;

export type AlgorithmSuiteVersion = (typeof SUPPORTED_ALGORITHM_SUITE_VERSIONS)[number];

export function isSupportedAlgorithmSuiteVersion(value: number): value is AlgorithmSuiteVersion {
  return value === ALGORITHM_SUITE_VERSION;
}

export function assertSupportedAlgorithmSuiteVersion(value: number): asserts value is AlgorithmSuiteVersion {
  if (!isSupportedAlgorithmSuiteVersion(value)) {
    throw new Error(`Unsupported crypto suite version: ${value}`);
  }
}

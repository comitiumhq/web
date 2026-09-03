import { defineConfig } from 'vitest/config';
import { coverageConfig } from '../../tooling/vitest/coverage';
import { vitestEnv } from '../../tooling/vitest/env';

export default defineConfig({
  test: {
    env: vitestEnv,
    coverage: coverageConfig,
  },
});

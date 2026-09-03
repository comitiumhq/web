import { defineConfig } from 'vitest/config';
import { coverageConfig } from '../../tooling/vitest/coverage';

export default defineConfig({
  test: {
    coverage: coverageConfig,
  },
});

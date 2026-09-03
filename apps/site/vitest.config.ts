import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';
import { coverageConfig } from '../../tooling/vitest/coverage';

export default defineConfig({
	plugins: [tsconfigPaths()],
	test: {
		include: ['src/**/*.test.ts'],
		coverage: coverageConfig,
	},
});

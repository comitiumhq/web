import { playwright } from '@vitest/browser-playwright';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';
import { coverageConfig } from '../../tooling/vitest/coverage';
import { vitestEnv } from '../../tooling/vitest/env';

export default defineConfig({
	plugins: [react(), tsconfigPaths()],
	optimizeDeps: {
		include: [
			'@dnd-kit/react',
			'@dnd-kit/react/sortable',
			'react/jsx-dev-runtime',
			'vitest-browser-react',
			'@hookform/resolvers/zod',
			'@privy-io/react-auth',
			'@tanstack/react-router',
			'neverthrow',
			'react-hook-form',
		],
	},
	test: {
		api: { host: '127.0.0.1', port: 63315, strictPort: true },
		env: vitestEnv,
		projects: [
			{
				extends: true,
				test: {
					name: 'unit',
					environment: 'node',
					include: ['src/**/*.test.ts'],
				},
			},
			{
				extends: true,
				test: {
					name: 'browser',
					include: ['src/**/*.browser.test.tsx'],
					browser: {
						enabled: true,
						headless: true,
						provider: playwright(),
						instances: [{ browser: 'chromium' }],
					},
				},
			},
		],
		coverage: coverageConfig,
	},
});

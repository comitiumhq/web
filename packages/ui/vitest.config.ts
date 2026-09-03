import { playwright } from '@vitest/browser-playwright';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';
import { coverageConfig } from '../../tooling/vitest/coverage';

export default defineConfig({
	plugins: [react()],
	optimizeDeps: {
		include: ['react/jsx-dev-runtime', 'vitest-browser-react', 'react-hook-form'],
	},
	test: {
		api: { host: '127.0.0.1', port: 63317, strictPort: true },
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

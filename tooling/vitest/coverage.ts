import type { CoverageV8Options } from 'vitest';

export const coverageConfig = {
  provider: 'v8',
  reporter: ['text', 'json-summary', 'html'],
  include: ['src/**/*.{ts,tsx}'],
  exclude: [
    'src/**/__tests__/**',
    'src/**/*.test.{ts,tsx}',
    'src/**/*.browser.test.tsx',
    'src/**/*.d.ts',
    'src/**/generated/**',
    'src/test/**',
    'src/routeTree.gen.ts',
  ],
} satisfies CoverageV8Options;

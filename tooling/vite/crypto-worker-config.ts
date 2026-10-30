import type { UserConfig } from 'vite';

/**
 * Keep the Crypto Worker in one executable asset when dependencies include dynamic imports.
 */
export const cryptoWorkerConfig: UserConfig['worker'] = {
  rollupOptions: {
    output: { inlineDynamicImports: true },
  },
};

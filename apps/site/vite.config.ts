import { fileURLToPath, URL } from 'node:url';
import { cloudflare } from '@cloudflare/vite-plugin';
import tailwindcss from '@tailwindcss/vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

import { ssrExclude } from '../../tooling/vite/ssr-exclude';

export default defineConfig({
  envDir: fileURLToPath(new URL('../..', import.meta.url)),
  server: {
    port: 3000,
  },
  build: {
    emptyOutDir: true,
    outDir: fileURLToPath(new URL('../../dist/site', import.meta.url)),
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
    dedupe: [
      'react',
      'react-dom',
      '@radix-ui/react-focus-scope',
      '@radix-ui/react-compose-refs',
      '@radix-ui/react-slot',
      '@radix-ui/react-dismissable-layer',
      '@radix-ui/react-portal',
      '@radix-ui/react-presence',
      '@radix-ui/react-primitive',
    ],
  },
  optimizeDeps: {
    include: ['@radix-ui/react-focus-scope', '@radix-ui/react-compose-refs', '@radix-ui/react-slot'],
  },
  plugins: [
    ssrExclude(),
    tsconfigPaths(),
    tailwindcss(),
    tanstackStart(),
    cloudflare({ inspectorPort: 9230, viteEnvironment: { name: 'ssr' } }),
    react(),
  ],
});

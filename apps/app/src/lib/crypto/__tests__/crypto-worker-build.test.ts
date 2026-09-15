import { fileURLToPath } from 'node:url';
import { build } from 'vite';
import { describe, expect, it } from 'vitest';

const APP_ROOT = fileURLToPath(new URL('../../../..', import.meta.url));
const VIRTUAL_ENTRY = 'virtual:crypto-worker-build-test';
const RESOLVED_VIRTUAL_ENTRY = `\0${VIRTUAL_ENTRY}`;

describe('crypto worker production build', () => {
  it(
    'emits an executable worker chunk instead of embedding the TypeScript source as an asset',
    { timeout: 15_000 },
    async () => {
      const result = await build({
        configFile: false,
        logLevel: 'silent',
        root: APP_ROOT,
        plugins: [
          {
            name: 'crypto-worker-build-test-entry',
            resolveId(id) {
              return id === VIRTUAL_ENTRY ? RESOLVED_VIRTUAL_ENTRY : null;
            },
            load(id) {
              return id === RESOLVED_VIRTUAL_ENTRY
                ? "import { CryptoProxy } from '@comitium/crypto'; CryptoProxy.init();"
                : null;
            },
          },
        ],
        build: {
          minify: false,
          write: false,
          rollupOptions: {
            input: VIRTUAL_ENTRY,
            output: { entryFileNames: 'entry.js' },
          },
        },
      });

      if (!Array.isArray(result) && !('output' in result)) {
        throw new Error('Expected an in-memory Vite build result');
      }

      const buildResults = Array.isArray(result) ? result : [result];
      const outputs = buildResults.flatMap((buildResult) => buildResult.output);
      const entry = outputs.find((output) => output.type === 'chunk' && output.fileName === 'entry.js');
      const worker = outputs.find((output) => output.fileName.startsWith('assets/crypto.worker-'));

      const embedsRawTypeScriptWorker = entry?.type === 'chunk' && entry.code.includes('data:video/mp2t;base64');

      expect(entry?.type).toBe('chunk');
      expect(embedsRawTypeScriptWorker).toBe(false);
      expect(entry?.type === 'chunk' ? entry.code : '').toContain('assets/crypto.worker-');
      expect(worker?.type).toBe('asset');
      expect(worker?.fileName).toMatch(/\.js$/);
    },
  );
});

import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';
import { build } from 'vite';
import { describe, expect, it, vi } from 'vitest';
import { cryptoWorkerConfig } from '../../../../../../tooling/vite/crypto-worker-config';

const APP_ROOT = fileURLToPath(new URL('../../../..', import.meta.url));
const VIRTUAL_ENTRY = 'virtual:crypto-worker-build-test';
const RESOLVED_VIRTUAL_ENTRY = `\0${VIRTUAL_ENTRY}`;

describe('crypto worker production build', () => {
  it(
    'emits an executable worker that initializes without JavaScript string evaluation',
    { timeout: 60_000 },
    async () => {
      const result = await build({
        configFile: false,
        logLevel: 'silent',
        root: APP_ROOT,
        worker: cryptoWorkerConfig,
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

      if (worker?.type !== 'asset') {
        throw new Error('Expected an executable crypto worker asset');
      }

      expect(worker.fileName).toMatch(/\.js$/);

      const source = typeof worker.source === 'string' ? worker.source : new TextDecoder().decode(worker.source);

      const functionConstructor = vi.fn(() => {
        throw new EvalError('String evaluation is forbidden by CSP');
      });

      const endpoint = { addEventListener: vi.fn(), postMessage: vi.fn() };

      runInNewContext(source, {
        ...endpoint,
        self: endpoint,
        Function: functionConstructor,
        AbortController,
        TextEncoder,
        TextDecoder,
        crypto,
      });

      expect(endpoint.addEventListener).toHaveBeenCalledWith('message', expect.any(Function));
      expect(functionConstructor).not.toHaveBeenCalled();
    },
  );
});

import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { loadEnv, type Plugin, type ResolvedConfig } from 'vite';

const API_ORIGIN = '__COMITIUM_API_ORIGIN__';

export function injectCryptoApiOrigin(headers: string, apiUrl: string): string {
  const url = new URL(apiUrl);
  const isHttp = ['http:', 'https:'].includes(url.protocol);
  const hasCredentials = Boolean(url.username || url.password);
  const hasOriginPlaceholder = headers.includes(API_ORIGIN);

  if (!isHttp || hasCredentials || !hasOriginPlaceholder) {
    throw new Error('Invalid crypto Worker headers configuration');
  }

  return headers.replaceAll(API_ORIGIN, url.origin);
}

export function cryptoWorkerHeaders(): Plugin {
  let config: ResolvedConfig;

  return {
    name: 'comitium-crypto-worker-headers',
    apply: 'build',
    configResolved(resolved) {
      config = resolved;
    },
    async writeBundle(output) {
      if (this.environment.name !== 'client' || !output.dir) {
        return;
      }

      const apiUrl = loadEnv(config.mode, config.envDir, 'VITE_API').VITE_API;
      const path = resolve(output.dir, '_headers');
      const headers = await readFile(path, 'utf8');

      await writeFile(path, injectCryptoApiOrigin(headers, apiUrl));
    },
  };
}

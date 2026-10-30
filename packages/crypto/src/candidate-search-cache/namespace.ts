import { hexToBytes } from '@noble/hashes/utils.js';
import type { z } from 'zod';
import type {
  CandidateSearchCacheErrorCode,
  CandidateSearchCacheHandle,
  CandidateSearchCacheNamespace,
  Catalog,
} from '../schemas/candidate-search-cache';
import type { CandidateSearchStore } from './database';

const encoder = new TextEncoder();

export class CandidateSearchCacheError extends Error {
  readonly code: CandidateSearchCacheErrorCode;

  constructor(code: CandidateSearchCacheError['code']) {
    super(`Candidate search cache ${code}`);
    this.name = 'CandidateSearchCacheError';
    this.code = code;
  }
}

export function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);

  if (!result.success) {
    throw new CandidateSearchCacheError('invalid');
  }

  return result.data;
}

export function namespaceKey(key: string): ArrayBuffer {
  return hexToBytes(key).slice().buffer;
}

export function namespaceRange(key: string): IDBKeyRange {
  const binary = namespaceKey(key);
  return IDBKeyRange.bound([binary], [binary, []]);
}

function jsonBytes(value: unknown): number {
  return encoder.encode(JSON.stringify(value)).byteLength;
}

export function catalogBytes(catalog: Catalog): number {
  return (
    256 + 2 * jsonBytes(catalog) + catalog.namespaces.reduce((bytes, namespace) => bytes + namespace.accountedBytes, 0)
  );
}

export function currentNamespace(catalog: Catalog, handle: CandidateSearchCacheHandle): CandidateSearchCacheNamespace {
  const namespace = catalog.namespaces.find(
    (entry) => entry.key === handle.key && entry.generation === handle.generation,
  );

  if (!namespace) {
    throw new CandidateSearchCacheError('changed');
  }

  return namespace;
}

export async function removeNamespace(
  store: CandidateSearchStore,
  catalog: Catalog,
  namespace: CandidateSearchCacheNamespace,
) {
  await store.delete(namespaceRange(namespace.key));

  catalog.namespaces = catalog.namespaces.filter((entry) => entry.key !== namespace.key);
  catalog.fence = crypto.randomUUID();
}

export async function admitNamespace(
  store: CandidateSearchStore,
  catalog: Catalog,
  active: CandidateSearchCacheNamespace,
  budget: number,
  maxNamespaces: number,
) {
  const inactive = catalog.namespaces
    .filter((entry) => entry.key !== active.key)
    .sort((left, right) => left.lastUsedAt - right.lastUsedAt);

  while (catalog.namespaces.length > maxNamespaces || catalogBytes(catalog) > budget) {
    const oldest = inactive.shift();

    if (!oldest) {
      throw new CandidateSearchCacheError('capacity');
    }

    await removeNamespace(store, catalog, oldest);
  }
}

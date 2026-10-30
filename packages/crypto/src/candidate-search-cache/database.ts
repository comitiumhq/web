import { type DBSchema, type IDBPDatabase, type IDBPObjectStore, openDB } from 'idb';
import { isDefined } from '../runtime-guards';
import {
  CANDIDATE_SEARCH_CACHE_VERSION,
  type Catalog,
  catalogHeaderSchema,
  catalogSchema,
} from '../schemas/candidate-search-cache';
import { CandidateSearchCacheError, parse } from './namespace';

export interface CandidateSearchDatabase extends DBSchema {
  records: { key: string | [ArrayBuffer, string | ArrayBuffer]; value: unknown };
}

export type CandidateSearchDatabaseOpener = () => Promise<IDBPDatabase<CandidateSearchDatabase>>;
export type CandidateSearchStore = IDBPObjectStore<CandidateSearchDatabase, ['records'], 'records', 'readwrite'>;
export type CandidateSearchReadStore = IDBPObjectStore<
  CandidateSearchDatabase,
  ['records'],
  'records',
  'readonly' | 'readwrite'
>;
let database: Promise<IDBPDatabase<CandidateSearchDatabase>> | undefined;

/**
 * Native version 2 fences old readers before replacing the disposable source-only representation.
 * An old open connection blocks the cutover explicitly; it never writes the new format.
 */
export function openCandidateSearchDatabase(): Promise<IDBPDatabase<CandidateSearchDatabase>> {
  database ??= new Promise<IDBPDatabase<CandidateSearchDatabase>>((resolve, reject) => {
    let blocked = false;
    const pending = openDB<CandidateSearchDatabase>('comitium_candidate_search_v1', 2, {
      upgrade(db) {
        if (db.objectStoreNames.contains('records')) {
          db.deleteObjectStore('records');
        }

        db.createObjectStore('records');
      },
      blocked() {
        blocked = true;
        reject(new CandidateSearchCacheError('blocked'));
      },
      blocking() {
        void pending.then((connection) => connection.close());
        database = undefined;
      },
      terminated() {
        database = undefined;
      },
    });

    void pending.then((connection) => {
      if (blocked) {
        connection.close();
      } else {
        resolve(connection);
      }
    }, reject);
  }).catch((error) => {
    database = undefined;
    throw error;
  });

  return database;
}

function emptyCatalog(): Catalog {
  return { version: CANDIDATE_SEARCH_CACHE_VERSION, fence: crypto.randomUUID(), namespaces: [] };
}

function readCatalog(raw: unknown): Catalog {
  if (!isDefined(raw)) {
    return emptyCatalog();
  }

  const header = catalogHeaderSchema.safeParse(raw);

  if (header.success && header.data.version > CANDIDATE_SEARCH_CACHE_VERSION) {
    throw new CandidateSearchCacheError('unsupported');
  }

  return parse(catalogSchema, raw);
}

async function cacheOperation<T>(action: () => Promise<T>): Promise<T> {
  if (!globalThis.indexedDB) {
    throw new CandidateSearchCacheError('unavailable');
  }

  try {
    return await action();
  } catch (error) {
    if (error instanceof CandidateSearchCacheError) {
      throw error;
    }

    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      throw new CandidateSearchCacheError('quota');
    }

    throw new CandidateSearchCacheError('unavailable');
  }
}

export function cacheRead<T>(
  open: CandidateSearchDatabaseOpener,
  action: (store: CandidateSearchReadStore, catalog: Catalog) => T | Promise<T>,
): Promise<T> {
  return cacheOperation(async () => {
    const transaction = (await open()).transaction('records');

    void transaction.done.catch(() => {});

    const catalog = readCatalog(await transaction.store.get('catalog'));
    const result = await action(transaction.store, catalog);

    await transaction.done;

    return result;
  });
}

/**
 * Only IDB requests belong inside this callback; encryption/compression finishes before it starts.
 */
export function cacheTransaction<T>(
  open: CandidateSearchDatabaseOpener,
  action: (store: CandidateSearchStore, catalog: Catalog) => T | Promise<T>,
  signal?: AbortSignal,
): Promise<T> {
  return cacheOperation(async () => {
    signal?.throwIfAborted();
    const connection = await open();
    signal?.throwIfAborted();

    const transaction = connection.transaction('records', 'readwrite');
    void transaction.done.catch(() => {});

    const abort = () => {
      try {
        transaction.abort();
      } catch {
        /**
         * The transaction may already be completed or aborted.
         */
      }
    };
    signal?.addEventListener('abort', abort, { once: true });

    try {
      const catalog = readCatalog(await transaction.store.get('catalog'));
      const result = await action(transaction.store, catalog);

      await transaction.store.put(parse(catalogSchema, catalog), 'catalog');
      await transaction.done;

      return result;
    } catch (error) {
      abort();

      await transaction.done.catch(() => {});

      throw error;
    } finally {
      signal?.removeEventListener('abort', abort);
    }
  });
}

export function resetCacheDatabase(open: CandidateSearchDatabaseOpener): Promise<void> {
  return cacheOperation(async () => {
    const transaction = (await open()).transaction('records', 'readwrite');

    void transaction.done.catch(() => {});

    const raw = await transaction.store.get('catalog');
    const header = catalogHeaderSchema.safeParse(raw);

    if (header.success && header.data.version > CANDIDATE_SEARCH_CACHE_VERSION) {
      transaction.abort();
      await transaction.done.catch(() => {});

      throw new CandidateSearchCacheError('unsupported');
    }

    await transaction.store.clear();
    await transaction.store.put(emptyCatalog(), 'catalog');
    await transaction.done;
  });
}

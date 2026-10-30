import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex } from '@noble/hashes/utils.js';
import { base64 } from '@scure/base';
import { deleteDB, type IDBPDatabase, openDB } from 'idb';
import { decryptApplicationWithVaultKey, encryptApplicationWithVaultKey } from '../application-encryption';
import { type CandidateProfileValues, createCandidateProfile } from '../candidate-profile';
import { CandidateSearchCache, type CandidateSearchCacheNamespace } from '../candidate-search-cache';
import type { CandidateSearchDatabase } from '../candidate-search-cache/database';
import type { CandidateSearchHandle, CandidateSearchProfileDocument } from '../candidate-search-protocol';
import { candidateProfileContext } from '../context';
import { publicEncryptionKeySchema } from '../schemas';
import { wrappedUserKeySchema } from '../schemas/user-key';
import type { VaultKeyAccess } from '../schemas/vault-key';
import { createCryptoSessionIdentity } from '../session';
import { wrapSearchKey, wrapVaultKey } from '../vault-key';
import { CandidateSearchSession } from '../worker/candidate-search-session';
import { OrgVault } from '../worker/org-vault';
import { UserKeySession } from '../worker/user-key-session';
import vector from './fixtures/key-protocol-v1.json';

export const nativeSearchKeys = {
  ...vector,
  userPublicKey: publicEncryptionKeySchema.parse(vector.userPublicKey),
  encryptedUserKey: wrappedUserKeySchema.parse(vector.encryptedUserKey),
};

const NATIVE_SEARCH_ORG = '0199a000-0000-7000-8000-000000000099';

export interface NativeSearchFixture {
  name: string;
  access: VaultKeyAccess;
  database: IDBPDatabase<CandidateSearchDatabase>;
  cache: CandidateSearchCache;
  search: CandidateSearchSession;
  session: UserKeySession;
  namespace: CandidateSearchCacheNamespace;
  index: CandidateSearchHandle;
  source: (
    number: number,
    values?: Partial<CandidateProfileValues>,
    revision?: number,
  ) => Promise<CandidateSearchProfileDocument>;
  bootstrap: (profiles: CandidateSearchProfileDocument[]) => Promise<void>;
}

export async function nativeSearchFixture(
  name = `comitium_disposable_candidate_index_${crypto.randomUUID()}`,
  maxBytes?: number,
): Promise<NativeSearchFixture> {
  let created = false;

  const database = await openDB<CandidateSearchDatabase>(name, 2, {
    upgrade(db) {
      created = true;
      db.createObjectStore('records');
    },
  });

  try {
    const cache = new CandidateSearchCache({ database: async () => database, maxBytes });
    let search: CandidateSearchSession;
    const session = new UserKeySession(() => search?.clearCandidateSearch());

    session.configure('http://127.0.0.1:63315');
    const vault = new OrgVault(session);

    search = new CandidateSearchSession(
      session,
      vault,
      {
        async decryptApplication(envelope, orgId, access, context) {
          return decryptApplicationWithVaultKey(envelope, await vault.getVaultKey(orgId, access), context);
        },
      },
      cache,
    );

    await session.unlockWithRecoveryCode(
      nativeSearchKeys.encryptedUserKey,
      nativeSearchKeys.userId,
      nativeSearchKeys.userPublicKey,
      nativeSearchKeys.recoveryCode,
      false,
    );

    const privateKey = base64.decode(nativeSearchKeys.userPrivateKey);

    const keyContext = {
      orgId: NATIVE_SEARCH_ORG,
      vaultKeyVersion: 1,
      recipientUserId: nativeSearchKeys.userId,
      recipientKeyVersion: 1,
    };

    const access = {
      ...keyContext,
      vaultPublicKey: nativeSearchKeys.userPublicKey,
      wrappedVaultKey: await wrapVaultKey(privateKey, nativeSearchKeys.userPublicKey, keyContext),
      searchKey: await wrapSearchKey(new Uint8Array(32).fill(11), privateKey, {
        orgId: NATIVE_SEARCH_ORG,
        vaultKeyVersion: 1,
        searchKeyVersion: 1,
      }),
    };

    privateKey.fill(0);

    const context = {
      ...createCryptoSessionIdentity(nativeSearchKeys.encryptedUserKey, nativeSearchKeys.userId),
      orgId: NATIVE_SEARCH_ORG,
      scopeToken: 'native-search-test',
      corpusVersion: 1 as const,
    };

    let namespace = await cache.open(context, await cache.captureFence());

    if (!namespace.wrappedKey) {
      namespace = await cache.installKey(namespace, await search.createCandidateSearchCacheKey(namespace, access));
    }

    const index = await search.beginCandidateSearch(
      { orgId: NATIVE_SEARCH_ORG, scopeToken: context.scopeToken },
      access,
      namespace,
    );

    const result: NativeSearchFixture = {
      name,
      access,
      database,
      cache,
      search,
      session,
      namespace,
      index,
      async source(number, values = {}, revision = 1) {
        const candidateId = `00000000-0000-4000-8000-${String(number).padStart(12, '0')}`;

        const profile = createCandidateProfile({
          firstName: 'Anna',
          lastName: 'Smith',
          email: 'anna+work@example.test',
          phone: null,
          linkedIn: null,
          github: null,
          website: null,
          location: null,
          currentTitle: null,
          currentCompany: null,
          ...values,
        });

        const encrypted = await encryptApplicationWithVaultKey(
          access.vaultPublicKey,
          1,
          profile,
          candidateProfileContext(NATIVE_SEARCH_ORG, candidateId),
        );

        const profileFingerprint = bytesToHex(sha256(new TextEncoder().encode(JSON.stringify(encrypted))));

        return {
          candidateId,
          profileRevision: revision,
          profileFingerprint,
          profile: encrypted,
          firstSeenAt: '2026-01-01T00:00:00Z',
        };
      },
      async bootstrap(profiles) {
        const boot = await search.commitCandidateSearch(result.index, {
          kind: 'bootstrap',
          corpusVersion: 1,
          scopeToken: context.scopeToken,
          head: '0',
          upperCandidateId: profiles.at(-1)?.candidateId ?? null,
          profiles,
          expectedCursor: null,
          nextCursor: null,
        });

        const ready = await search.commitCandidateSearch(boot.index, {
          kind: 'changes',
          scopeToken: context.scopeToken,
          since: '0',
          nextCursor: '0',
          head: '0',
          throughCursor: '0',
          caughtUp: true,
          events: [],
        });

        result.namespace = ready.namespace;
        result.index = ready.index;
      },
    };

    return result;
  } catch (error) {
    database.close();

    if (created) {
      await deleteDB(name);
    }

    throw error;
  }
}

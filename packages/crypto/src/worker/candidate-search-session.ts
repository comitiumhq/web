import { candidateProfileSchema } from '../candidate-profile';
import { CandidateSearchCache } from '../candidate-search-cache';
import type {
  CandidateSearchEncryptedDocument,
  CandidateSearchFilter,
  CandidateSearchHandle,
  CandidateSearchReference,
  CandidateSearchScope,
} from '../candidate-search-protocol';
import { candidateProfileContext } from '../context';
import type { CandidateSearchCacheBinding, CandidateSearchCommit } from '../schemas/candidate-search-cache';
import { type VaultKeyAccess, vaultKeyAccessSchema } from '../schemas/vault-key';
import { CandidateSearch } from './candidate-search';
import { CandidateSearchCacheCipher } from './candidate-search-cache-cipher';
import { candidateSearchFields } from './candidate-search-documents';
import { CandidateSearchError } from './candidate-search-error';
import type { CryptoWorkerApi } from './crypto-api';
import type { OrgVault } from './org-vault';
import type { UserKeySession } from './user-key-session';

/**
 * Fresh vault authorization precedes local unwrap. All source plaintext and disk crypto stay here.
 */
export class CandidateSearchSession {
  private readonly search: CandidateSearch;
  private readonly cacheCipher: CandidateSearchCacheCipher;
  private access: VaultKeyAccess | null = null;
  private start = 0;

  constructor(
    private readonly session: UserKeySession,
    private readonly vault: OrgVault,
    private readonly crypto: Pick<CryptoWorkerApi, 'decryptApplication'>,
    cache = new CandidateSearchCache(),
  ) {
    this.cacheCipher = new CandidateSearchCacheCipher(session);
    this.search = new CandidateSearch(cache, this.cacheCipher, (document) => this.decryptFields(document));
  }

  async createCandidateSearchCacheKey(binding: CandidateSearchCacheBinding, access: VaultKeyAccess) {
    const generation = this.session.keys.captureGeneration();

    await this.vault.getVaultKey(binding.context.orgId, access);
    this.session.keys.assertGeneration(generation);

    return this.cacheCipher.createKey(binding);
  }

  async beginCandidateSearch(
    scope: CandidateSearchScope,
    value: VaultKeyAccess,
    binding: CandidateSearchCacheBinding,
  ): Promise<CandidateSearchHandle> {
    this.session.requireIdentity();
    this.clearCandidateSearch();

    const start = this.start;
    const generation = this.session.keys.captureGeneration();
    const access = vaultKeyAccessSchema.parse(value);

    await this.vault.getVaultKey(scope.orgId, access);
    this.assertStart(start, generation);
    await this.cacheCipher.open(scope, binding);

    this.assertStart(start, generation);
    this.access = access;

    return this.search.reset(scope, binding);
  }

  commitCandidateSearch(handle: CandidateSearchHandle, change: CandidateSearchCommit) {
    this.session.requireIdentity();

    return this.search.commit(handle, change);
  }

  evaluateCandidateSearchReferences(
    handle: CandidateSearchHandle,
    filter: CandidateSearchFilter,
    references: CandidateSearchReference[],
  ) {
    this.session.requireIdentity();

    return this.search.evaluateReferences(handle, filter, references);
  }

  candidateSearchStatus() {
    return this.search.stats();
  }

  clearCandidateSearch(): void {
    this.start += 1;
    this.access = null;
    this.search.clear();
    this.cacheCipher.clear();
  }

  private async decryptFields(document: CandidateSearchEncryptedDocument) {
    const access = this.access;
    const start = this.start;
    const generation = this.session.keys.captureGeneration();

    if (!access) {
      throw new CandidateSearchError('SEARCH_SCOPE_CHANGED');
    }

    if (!document.profile) {
      return null;
    }

    const value = await this.crypto.decryptApplication(
      document.profile,
      access.orgId,
      access,
      candidateProfileContext(access.orgId, document.candidateId),
    );

    this.assertStart(start, generation);

    return candidateSearchFields(candidateProfileSchema.parse(value));
  }

  private assertStart(start: number, generation: number): void {
    this.session.keys.assertGeneration(generation);

    if (start !== this.start) {
      throw new CandidateSearchError('SEARCH_SCOPE_CHANGED');
    }
  }
}

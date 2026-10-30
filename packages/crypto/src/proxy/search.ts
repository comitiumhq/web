import type { CandidateProfileSearchField } from '../candidate-profile-search-hash';
import type { CandidateProjectionItem } from '../candidate-projections';
import type {
  CandidateSearchFilter,
  CandidateSearchHandle,
  CandidateSearchReference,
  CandidateSearchScope,
} from '../candidate-search-protocol';
import type { SearchableCustomFieldType } from '../custom-field-search';
import type { CategoricalFormFieldKind } from '../form-field-search-hash';
import type { CandidateSearchCacheBinding, CandidateSearchCommit } from '../schemas/candidate-search-cache';
import type { VaultKeyAccess } from '../schemas/vault-key';
import { hasActiveWorker, runOnWorker } from './runtime';

export const searchProxy = {
  async hashTagLabel(orgId: string, vaultAccess: VaultKeyAccess, label: string): Promise<string> {
    return runOnWorker((api) => api.hashTagLabel(orgId, vaultAccess, label));
  },

  async hashCustomFieldValue(
    orgId: string,
    vaultAccess: VaultKeyAccess,
    fieldId: string,
    fieldType: SearchableCustomFieldType,
    plaintext: unknown,
  ): Promise<string> {
    return runOnWorker((api) => api.hashCustomFieldValue(orgId, vaultAccess, fieldId, fieldType, plaintext));
  },

  async hashCategoricalFormFieldValue(
    orgId: string,
    vaultAccess: VaultKeyAccess,
    fieldId: string,
    kind: CategoricalFormFieldKind,
    value: boolean | string,
  ): Promise<string> {
    return runOnWorker((api) => api.hashCategoricalFormFieldValue(orgId, vaultAccess, fieldId, kind, value));
  },

  async hashCandidateProfileSearchValue(
    orgId: string,
    vaultAccess: VaultKeyAccess,
    field: CandidateProfileSearchField,
    value: string | number,
  ): Promise<string> {
    return runOnWorker((api) => api.hashCandidateProfileSearchValue(orgId, vaultAccess, field, value));
  },

  processCandidateProjection(orgId: string, access: VaultKeyAccess, item: CandidateProjectionItem) {
    return runOnWorker((api) => api.processCandidateProjection(orgId, access, item));
  },

  createCandidateSearchCacheKey(binding: CandidateSearchCacheBinding, access: VaultKeyAccess) {
    return runOnWorker((api) => api.createCandidateSearchCacheKey(binding, access));
  },

  beginCandidateSearch(scope: CandidateSearchScope, access: VaultKeyAccess, binding: CandidateSearchCacheBinding) {
    return runOnWorker((api) => api.beginCandidateSearch(scope, access, binding));
  },

  commitCandidateSearch(handle: CandidateSearchHandle, change: CandidateSearchCommit) {
    return runOnWorker((api) => api.commitCandidateSearch(handle, change));
  },

  evaluateCandidateSearchReferences(
    handle: CandidateSearchHandle,
    filter: CandidateSearchFilter,
    references: CandidateSearchReference[],
  ) {
    return runOnWorker((api) => api.evaluateCandidateSearchReferences(handle, filter, references));
  },

  candidateSearchStatus() {
    return runOnWorker((api) => api.candidateSearchStatus());
  },

  clearCandidateSearch() {
    if (!hasActiveWorker()) {
      return Promise.resolve();
    }

    return runOnWorker((api) => api.clearCandidateSearch());
  },
};

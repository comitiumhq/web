import type { CandidateProfile } from '../candidate-profile';
import type { CandidateSourceMutation } from '../candidate-search-cache/profiles';
import {
  type CandidateIndexDocumentWrite,
  candidateSearchDataBytes,
  type PreparedCandidateIndex,
} from '../candidate-search-cache/types';
import type { CandidateSearchEncryptedDocument } from '../candidate-search-protocol';
import {
  CANDIDATE_SEARCH_CACHE_LIMITS,
  type CandidateSearchCacheNamespace,
  type CandidateSearchFields,
  type CandidateSearchPayload,
  type StoredProfile,
} from '../schemas/candidate-search-cache';
import type { CandidateSearchCacheCipher } from './candidate-search-cache-cipher';
import { CandidateSearchError } from './candidate-search-error';
import { candidateExpandedTermBytes, candidateProfileTerms } from './candidate-search-terms';

export type CandidateSearchSourceDecoder = (
  document: CandidateSearchEncryptedDocument,
) => Promise<CandidateSearchFields | null>;

export interface CandidateIndexOperation {
  id: number;
  kind: 'append' | 'update' | 'remove';
  content: string;
}

export interface CandidateDocumentContext {
  cipher: CandidateSearchCacheCipher;
  namespace: CandidateSearchCacheNamespace;
  records: Array<StoredProfile | null>;
  mutations: CandidateSourceMutation[];
  decode: CandidateSearchSourceDecoder;
  assertCurrent: () => void;
}

export interface CandidatePreparedDocuments {
  prepared: PreparedCandidateIndex;
  operations: CandidateIndexOperation[];
}

/**
 * Canonical profile decoding and source metadata belong here; FlexSearch owns term expansion.
 */
export async function prepareCandidateDocuments(
  context: CandidateDocumentContext,
): Promise<CandidatePreparedDocuments> {
  const prepared: PreparedCandidateIndex = {
    expectedRevision: context.namespace.indexRevision,
    nextDocumentId: context.namespace.nextDocumentId,
    documents: [],
    postings: [],
  };

  const operations: CandidateIndexOperation[] = [];
  let expandedBytes = 0;

  for (let position = 0; position < context.mutations.length; position++) {
    context.assertCurrent();
    const mutation = context.mutations[position];
    const document = mutation.document;
    const previous = context.records[position];
    const newerSource = previous && document && previous.profileRevision > document.profileRevision;
    const sameSource =
      previous &&
      document &&
      !previous.unreadable &&
      previous.profileRevision === document.profileRevision &&
      previous.profileFingerprint === document.profileFingerprint;

    if (newerSource || sameSource || (!previous && !document)) {
      continue;
    }

    const write: CandidateIndexDocumentWrite = {
      candidateId: mutation.candidateId,
      record: null,
      previousBytes: previous?.accountedBytes ?? 0,
      existed: Boolean(previous),
      previouslyUnreadable: previous?.unreadable ?? false,
    };

    if (document) {
      let payload: CandidateSearchPayload;
      let terms: string[];

      try {
        const fields = await context.decode(document);
        terms = candidateProfileTerms(fields);
        payload = { fields, unreadable: false };
      } catch {
        context.assertCurrent();
        terms = [];
        payload = { fields: null, unreadable: true };
      }

      context.assertCurrent();
      expandedBytes += candidateExpandedTermBytes(terms);

      if (expandedBytes > CANDIDATE_SEARCH_CACHE_LIMITS.maxBatchExpandedBytes) {
        throw new CandidateSearchError('SEARCH_RESOURCE_LIMIT');
      }

      const localId = previous?.localId ?? prepared.nextDocumentId++;
      const { candidateId, profileRevision, profileFingerprint } = document;
      const identity = { candidateId, profileRevision, profileFingerprint, localId, unreadable: payload.unreadable };
      const searchData = await context.cipher.encryptProfile(identity, payload);

      context.assertCurrent();
      write.record = { ...identity, searchData, accountedBytes: 512 + candidateSearchDataBytes(searchData) };
      operations.push({ id: localId, kind: previous ? 'update' : 'append', content: JSON.stringify(terms) });
    } else if (previous) {
      operations.push({ id: previous.localId, kind: 'remove', content: '' });
    }

    prepared.documents.push(write);
  }

  return { prepared, operations };
}

export function candidateSearchFields(profile: CandidateProfile | null): CandidateSearchFields | null {
  if (!profile) {
    return null;
  }

  return {
    firstName: profile.firstName,
    lastName: profile.lastName,
    email: profile.email,
    location: profile.location,
    currentTitle: profile.currentTitle?.slice(0, 280) ?? null,
    currentCompany: profile.currentCompany?.slice(0, 280) ?? null,
  };
}

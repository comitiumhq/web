import { type CandidateSearchEncryptedDocument, readCandidateSearchDocuments } from '../candidate-search-protocol';
import { isRecord } from '../runtime-guards';
import {
  type CandidateSearchCacheNamespace,
  type CandidateSearchCommit,
  candidateSearchCommitSchema,
} from '../schemas/candidate-search-cache';
import { CandidateSearchCacheError, parse } from './namespace';

export interface CandidateSourceMutation {
  candidateId: string;
  document: CandidateSearchEncryptedDocument | null;
}

/**
 * Bound encrypted inputs before Zod clones their envelopes.
 */
export function readCandidateSearchCommit(value: unknown): CandidateSearchCommit {
  if (!isRecord(value)) {
    throw new CandidateSearchCacheError('invalid');
  }

  const values = value.kind === 'changes' ? value.events : value.profiles;

  if (!Array.isArray(values) || values.length > 200) {
    throw new CandidateSearchCacheError('invalid');
  }

  const documents = [];

  for (const entry of values) {
    if (!isRecord(entry)) {
      throw new CandidateSearchCacheError('invalid');
    }

    if (value.kind === 'changes' && entry.operation === 'delete') {
      continue;
    }

    const { candidateId, profileRevision, profileFingerprint, profile } = entry;
    documents.push({ candidateId, profileRevision, profileFingerprint, profile });
  }

  readCandidateSearchDocuments(documents);
  return parse(candidateSearchCommitSchema, value);
}

export function candidateSourceMutations(
  namespace: CandidateSearchCacheNamespace,
  commit: CandidateSearchCommit,
): CandidateSourceMutation[] {
  const mutations = new Map<string, CandidateSourceMutation>();

  if (commit.kind === 'hydrate' && BigInt(commit.head) < BigInt(namespace.appliedCursor)) {
    return [];
  }

  const entries = commit.kind === 'changes' ? commit.events : commit.profiles;
  let previous = commit.kind === 'changes' ? BigInt(commit.since) : 0n;

  for (const entry of entries) {
    if ('sequence' in entry) {
      const sequence = BigInt(entry.sequence);

      if (sequence <= previous || sequence > BigInt(commit.kind === 'changes' ? commit.nextCursor : '0')) {
        throw new CandidateSearchCacheError('invalid');
      }

      previous = sequence;

      if (sequence <= BigInt(namespace.appliedCursor)) {
        continue;
      }
    }

    if ('operation' in entry && entry.operation === 'delete') {
      mutations.set(entry.candidateId, { candidateId: entry.candidateId, document: null });
      continue;
    }

    const { candidateId, profileRevision, profileFingerprint, profile } = entry;
    const old = mutations.get(candidateId)?.document;

    if (old && old.profileRevision > profileRevision) {
      continue;
    }

    mutations.set(candidateId, {
      candidateId,
      document: { candidateId, profileRevision, profileFingerprint, profile },
    });
  }

  return [...mutations.values()];
}

export function assertCandidateCommit(namespace: CandidateSearchCacheNamespace, commit: CandidateSearchCommit): void {
  if (commit.kind === 'bootstrap') {
    const scopeChanged = namespace.context.scopeToken !== commit.scopeToken;
    const cursorChanged = namespace.phase !== 'bootstrap' || namespace.bootstrapCursor !== commit.expectedCursor;
    const headChanged = namespace.bootstrapHead !== null && namespace.bootstrapHead !== commit.head;

    if (scopeChanged || cursorChanged || headChanged) {
      throw new CandidateSearchCacheError('changed');
    }
  } else if (commit.kind === 'changes') {
    const scopeChanged = namespace.context.scopeToken !== commit.scopeToken;
    const cursorChanged = namespace.phase === 'bootstrap' || BigInt(commit.since) > BigInt(namespace.appliedCursor);
    const invalidRange =
      BigInt(commit.nextCursor) < BigInt(commit.since) ||
      BigInt(commit.nextCursor) > BigInt(commit.throughCursor) ||
      BigInt(commit.throughCursor) > BigInt(commit.head) ||
      (commit.caughtUp && commit.nextCursor !== commit.throughCursor);

    if (invalidRange) {
      throw new CandidateSearchCacheError('invalid');
    }

    if (scopeChanged || cursorChanged) {
      throw new CandidateSearchCacheError('changed');
    }
  } else if (namespace.phase === 'bootstrap') {
    throw new CandidateSearchCacheError('changed');
  }
}

export function advanceCandidateCheckpoint(
  namespace: CandidateSearchCacheNamespace,
  commit: CandidateSearchCommit,
): void {
  if (commit.kind === 'bootstrap') {
    namespace.bootstrapHead = commit.head;
    namespace.bootstrapCursor = commit.nextCursor;

    if (commit.nextCursor === null) {
      namespace.phase = 'catchup';
      namespace.appliedCursor = commit.head;
    }
  } else if (commit.kind === 'changes') {
    if (BigInt(commit.nextCursor) > BigInt(namespace.appliedCursor)) {
      namespace.appliedCursor = commit.nextCursor;
    }

    if (commit.caughtUp && commit.nextCursor === commit.head && commit.nextCursor === namespace.appliedCursor) {
      namespace.phase = 'complete';
    }
  }
}

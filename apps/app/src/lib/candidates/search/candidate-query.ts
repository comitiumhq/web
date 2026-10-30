import {
  CANDIDATE_SEARCH_SOURCE_BATCH_SIZE,
  type CandidateSearchFilter,
  type CandidateSearchHandle,
  type CandidateSearchReference,
} from '@comitium/crypto/candidate-search-protocol';
import type {
  CandidateQueryResponse,
  CandidateSearchListRow,
  CandidateSearchReferenceRow,
  ServerCandidateQuery,
} from '@comitium/schemas/candidate-search';
import { hydrateCandidateCorpus, queryCandidates } from '@/lib/api/candidate-search';
import type { CandidateSearchReady, CandidateSearchRuntime } from './profile-corpus';

const PAGE_SIZE = 50;
const MAX_SCAN_BATCHES = 32;

type ScanResponse = Extract<CandidateQueryResponse, { mode: 'scan' }>;
interface PendingPage {
  rows: CandidateSearchReferenceRow[];
  hasMore: boolean;
  scanning: boolean;
}

export class CandidateSearchChanged extends Error {
  constructor() {
    super('Candidate search changed. Refresh the results.');
    this.name = 'CandidateSearchChanged';
  }
}

export interface CandidateDirectoryRow extends CandidateSearchListRow {
  searchIndex?: CandidateSearchHandle;
}

export interface CandidateDirectoryPage {
  rows: CandidateDirectoryRow[];
  hasMore: boolean;
  nextCursor: string | null;
  incomplete: boolean;
  approximate: boolean;
  unreadable: number;
  scanning: boolean;
}

export class PrivateCandidateSearch {
  private ready: CandidateSearchReady | null = null;
  private metadata: Pick<ScanResponse, 'queryScopeToken' | 'retrieval' | 'coverage'> | null = null;
  private rows: CandidateSearchReferenceRow[] = [];
  private offset = 0;
  private matches: CandidateSearchReferenceRow[] = [];
  private cursor: string | undefined;
  private lastCursor: string | undefined;
  private hasMore = true;
  private unreadable = 0;
  private pending: PendingPage | null = null;
  private active = true;

  constructor(
    private readonly orgId: string,
    private readonly server: ServerCandidateQuery,
    private readonly filter: CandidateSearchFilter,
  ) {}

  async page(
    runtime: CandidateSearchRuntime,
    ready: CandidateSearchReady,
    signal: AbortSignal,
  ): Promise<CandidateDirectoryPage> {
    this.check(signal);
    this.assertReady(ready);

    await this.revalidateBufferedPage(runtime, ready, signal);
    let batches = 0;

    while (true) {
      this.check(signal);

      if (this.pending) {
        return this.displayPage(ready, this.pending, signal);
      }

      if (this.matches.length > PAGE_SIZE || (this.offset === this.rows.length && !this.hasMore)) {
        const rows = this.matches.splice(0, PAGE_SIZE);
        this.pending = { rows, hasMore: this.matches.length > 0, scanning: false };

        return this.displayPage(ready, this.pending, signal);
      }

      if (this.offset === this.rows.length) {
        if (batches === MAX_SCAN_BATCHES) {
          this.pending = { rows: this.matches.splice(0, PAGE_SIZE), hasMore: true, scanning: true };

          return this.displayPage(ready, this.pending, signal);
        }

        await this.readNextBatch(ready, signal);
        batches += 1;
      } else {
        await this.collectRemainingMatches(runtime, ready, signal);
      }
    }
  }

  advance() {
    this.pending = null;
  }

  cancel() {
    this.active = false;
    this.rows = [];
    this.matches = [];
    this.pending = null;
    this.ready = null;
    this.metadata = null;
  }

  private assertReady(ready: CandidateSearchReady) {
    if (this.ready) {
      const indexChanged =
        this.ready.index.generation !== ready.index.generation ||
        this.ready.index.scopeToken !== ready.index.scopeToken;

      if (indexChanged) {
        throw new CandidateSearchChanged();
      }
    } else {
      this.ready = ready;
    }
  }

  private async revalidateBufferedPage(
    runtime: CandidateSearchRuntime,
    ready: CandidateSearchReady,
    signal: AbortSignal,
  ) {
    /**
     * Fresh authorization is required even if the entire page is already in the retained tail.
     */
    const hasRetainedRows = this.pending || this.offset < this.rows.length || (!this.hasMore && this.matches.length);

    if (this.metadata && hasRetainedRows) {
      await this.fetch(ready, this.lastCursor, signal);
    }

    const buffered = this.pending ? [...this.pending.rows, ...this.matches] : this.matches;

    if (buffered.length) {
      const evaluations = await this.evaluate(runtime, ready, buffered, signal);

      this.matches = [];

      for (const [index, evaluation] of evaluations.entries()) {
        if (evaluation.outcome === 'match') {
          this.matches.push(buffered[index]);
        } else if (evaluation.outcome !== 'no_match') {
          this.unreadable += 1;
        }
      }
    }

    this.pending = null;
  }

  private async readNextBatch(ready: CandidateSearchReady, signal: AbortSignal) {
    const cursor = this.cursor;
    const response = await this.fetch(ready, cursor, signal);

    if (response.pagination.hasMore && response.pagination.nextCursor === cursor) {
      throw new Error('Candidate search cursor did not advance');
    }

    this.rows = response.data;
    this.offset = 0;
    this.cursor = response.pagination.nextCursor ?? undefined;
    this.lastCursor = cursor;
    this.hasMore = response.pagination.hasMore;

    this.metadata = {
      queryScopeToken: response.queryScopeToken,
      retrieval: response.retrieval,
      coverage: response.coverage,
    };
  }

  private async collectRemainingMatches(
    runtime: CandidateSearchRuntime,
    ready: CandidateSearchReady,
    signal: AbortSignal,
  ) {
    const remaining = this.rows.slice(this.offset);

    const evaluations = await this.evaluate(runtime, ready, remaining, signal);

    for (const evaluation of evaluations) {
      if (this.matches.length > PAGE_SIZE) {
        break;
      }

      if (evaluation.outcome === 'match') {
        this.matches.push(this.rows[this.offset]);
      } else if (evaluation.outcome !== 'no_match') {
        this.unreadable += 1;
      }

      this.offset += 1;
    }
  }

  private async fetch(ready: CandidateSearchReady, cursor: string | undefined, signal: AbortSignal) {
    const response = await queryCandidates(
      this.orgId,
      {
        ...this.server,
        cursor,
        limit: 200,
        localEvaluation: { corpusVersion: 1, scopeToken: ready.index.scopeToken },
      },
      signal,
    );

    this.check(signal);

    if (response.mode !== 'scan') {
      throw new CandidateSearchChanged();
    }

    this.assertScope(ready, response.profileCorpus.scopeToken);

    if (this.metadata && response.queryScopeToken !== this.metadata.queryScopeToken) {
      throw new CandidateSearchChanged();
    }

    return response;
  }

  private async evaluate(
    runtime: CandidateSearchRuntime,
    ready: CandidateSearchReady,
    rows: CandidateSearchReferenceRow[],
    signal: AbortSignal,
  ) {
    const evaluate = () => runtime.evaluate(ready.index, this.filter, rows.map(candidateReference), signal);

    let evaluations = await evaluate();
    this.check(signal);
    const unknown = rows.filter((_row, index) => ['hydrate', 'unreadable'].includes(evaluations[index].outcome));

    if (unknown.length) {
      await this.hydrate(runtime, ready, unknown, signal);
      evaluations = await evaluate();
      this.check(signal);
    }

    return evaluations;
  }

  private async hydrate(
    runtime: CandidateSearchRuntime,
    ready: CandidateSearchReady,
    rows: CandidateSearchReferenceRow[],
    signal: AbortSignal,
  ) {
    for (let offset = 0; offset < rows.length; offset += CANDIDATE_SEARCH_SOURCE_BATCH_SIZE) {
      this.check(signal);
      const batch = rows.slice(offset, offset + CANDIDATE_SEARCH_SOURCE_BATCH_SIZE);

      const references = batch.map(candidateReference);

      const hydrated = await hydrateCandidateCorpus(this.orgId, ready.index.scopeToken, references, signal);
      this.check(signal);
      this.assertScope(ready, hydrated.scopeToken);
      const profiles = hydrated.profiles;

      if (profiles.length) {
        await runtime.applyDocuments(ready.index, profiles, hydrated.head, signal);
        this.check(signal);
      }

      for (const row of batch) {
        const current = profiles.find((profile) => profile.candidateId === row.candidateId);

        if (current) {
          row.profileRevision = current.profileRevision;
          row.profileFingerprint = current.profileFingerprint;
        }
      }
    }
  }

  private displayPage(ready: CandidateSearchReady, page: PendingPage, signal: AbortSignal) {
    this.check(signal);

    return this.result(
      page.rows.map((row) => ({ ...row, profile: null, searchIndex: ready.index })),
      page.hasMore,
      page.scanning,
    );
  }

  private result(rows: CandidateDirectoryPage['rows'], hasMore: boolean, scanning: boolean): CandidateDirectoryPage {
    return {
      rows,
      hasMore,
      nextCursor: null,
      incomplete: this.metadata?.coverage.professional === 'incomplete',
      approximate: this.metadata?.retrieval === 'approximate',
      unreadable: this.unreadable,
      scanning,
    };
  }

  private assertScope(ready: CandidateSearchReady, scopeToken: string) {
    if (scopeToken !== ready.index.scopeToken) {
      throw new CandidateSearchChanged();
    }
  }

  private check(signal: AbortSignal) {
    signal.throwIfAborted();

    if (!this.active) {
      throw new DOMException('Search was cancelled', 'AbortError');
    }
  }
}

function candidateReference(row: CandidateSearchReference): CandidateSearchReference {
  const { candidateId, profileRevision, profileFingerprint } = row;
  return { candidateId, profileRevision, profileFingerprint };
}

import type {
  CandidateSearchFilter,
  CandidateSearchHandle,
  CandidateSearchReference,
} from '@comitium/crypto/candidate-search-protocol';
import type { CryptoSessionIdentity } from '@comitium/crypto/session';
import type {
  CandidateSearchDefinition,
  CandidateSearchListRow,
  ServerCandidateQuery,
} from '@comitium/schemas/candidate-search';
import { focusManager, QueryClient, QueryClientProvider, QueryObserver } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, renderHook } from 'vitest-browser-react';
import { CandidatesPage } from '@/components/features/candidates';
import { candidateDefinition } from '@/components/features/candidates/filters';
import { CandidateSearchStateProvider } from '@/components/features/candidates/search-state';
import { invalidateApplicationPipelineStatus } from '@/hooks/mutations/invalidate-application-pipeline-status';
import { qk } from '@/hooks/query-keys';
import type { CandidateSearchSyncStatus } from '@/lib/candidates/search/profile-corpus';
import { useQueryCandidateDirectory } from './use-query-candidate-directory';
import { useQueryCandidateSearchSync } from './use-query-candidate-search-sync';

interface QueryWrapperProps {
  children: ReactNode;
}

const mocks = vi.hoisted(() => ({
  sync: vi.fn<(signal: AbortSignal) => Promise<CandidateSearchSyncStatus>>(),
  dispose: vi.fn(),
  query: vi.fn(),
  evaluate: vi.fn(),
}));

const identity: CryptoSessionIdentity = { userId: 'user-1', keyVersion: 1, encryptedKeyFingerprint: 'a'.repeat(64) };
const user = { id: identity.userId, encryptedUserKey: {} };
const pageSync = vi.hoisted(() => ({ runtime: false, ready: false, unlocked: true }));
const access = {};

const syncing: CandidateSearchSyncStatus = {
  phase: 'syncing',
  indexed: 200,
  unreadable: 0,
  ready: null,
  head: '0',
  projectionWorkAvailable: false,
};

const ready: CandidateSearchSyncStatus = { ...syncing, phase: 'ready' };

vi.mock('@comitium/auth/use-session', () => ({ useSession: () => ({ user }) }));
vi.mock('@comitium/auth/use-is-crypto-active', () => ({ useIsCryptoActive: () => pageSync.unlocked }));
vi.mock('@comitium/crypto/session', () => ({ createCryptoSessionIdentity: () => identity }));
vi.mock('./use-query-org-vault-access', () => ({ useQueryOrgVaultAccess: () => ({ data: access }) }));

vi.mock('@/lib/api/candidate-search', async (original) => ({
  ...(await original<Record<string, unknown>>()),
  queryCandidates: mocks.query,
}));

vi.mock('@/components/auth/candidate-search-coordinator', () => ({
  useCandidateSearchSync: () => ({
    runtime: pageSync.runtime ? { id: 'runtime-1', evaluate: mocks.evaluate } : null,
    status: pageSync.ready
      ? { phase: 'ready', ready: { index: { orgId: 'org-1', scopeToken: 'scope', generation: 1 } } }
      : null,
    error: null,
  }),
}));

vi.mock('@/components/features/candidate-sheet', () => ({ CandidateSheetMount: () => null }));
vi.mock('@/components/features/candidates/filter-panel', () => ({ CandidateFilterPanel: () => null }));
vi.mock('@/components/features/candidates/results', () => ({ CandidateResults: DirectoryResults }));

interface DirectoryResultsProps {
  orgId: string;
  definition: CandidateSearchDefinition;
  requestId: string;
}

function DirectoryResults({ orgId, definition, requestId }: DirectoryResultsProps) {
  const query = useQueryCandidateDirectory(orgId, definition, requestId);

  return <output>{query.isSuccess ? 'loaded' : 'pending'}</output>;
}

vi.mock('@/lib/candidates/search/profile-corpus', () => ({
  CandidateSearchRuntime: class {
    readonly id = 'runtime-1';
    readonly sync = mocks.sync;
    readonly dispose = mocks.dispose;

    constructor(
      readonly orgId: string,
      readonly identity: CryptoSessionIdentity,
    ) {}
  },
}));

function harness() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  const wrapper = ({ children }: QueryWrapperProps) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );

  return { client, wrapper };
}

afterEach(() => {
  vi.useRealTimers();
  focusManager.setFocused(undefined);
  vi.resetAllMocks();
  pageSync.runtime = false;
  pageSync.ready = false;
  pageSync.unlocked = true;
});

describe('Candidate search preparation scheduling', () => {
  it('keeps the initial list request alive while the search runtime and first scope become ready', async () => {
    pageSync.runtime = false;
    pageSync.ready = false;
    const response = Promise.withResolvers<unknown>();
    mocks.query.mockReturnValue(response.promise);
    const { client, wrapper: Wrapper } = harness();

    const view = () => (
      <Wrapper>
        <CandidateSearchStateProvider orgId="org-1">
          <CandidatesPage orgId="org-1" />
        </CandidateSearchStateProvider>
      </Wrapper>
    );

    const page = await render(view());

    await vi.waitFor(() => expect(mocks.query).toHaveBeenCalledOnce());

    expect(mocks.query.mock.calls[0]).toHaveLength(2);

    pageSync.runtime = true;
    await page.rerender(view());
    pageSync.ready = true;
    await page.rerender(view());

    expect(mocks.query).toHaveBeenCalledOnce();

    response.resolve({
      mode: 'list',
      data: [],
      pagination: { hasMore: false, nextCursor: null },
      coverage: { professional: 'not_requested' },
      retrieval: 'exact',
    });

    await expect.element(page.getByText('loaded')).toBeVisible();

    await page.unmount();
    client.clear();
  });

  it('refreshes only the ordinary list when the journal advances and leaves private scans intact', async () => {
    mocks.sync.mockResolvedValue(ready);
    const { client, wrapper } = harness();
    const load = vi.fn(async () => 'updated');
    const scan = vi.fn(async () => 'private');

    const observer = new QueryObserver(client, {
      queryKey: qk.candidate.directory('org-1', 'request-1'),
      queryFn: load,
      initialData: 'cached',
      staleTime: Number.POSITIVE_INFINITY,
      meta: { privateCandidateSearch: false },
    });

    const unsubscribe = observer.subscribe(() => {});

    const privateObserver = new QueryObserver(client, {
      queryKey: qk.candidate.directory('org-1', 'private-1'),
      queryFn: scan,
      initialData: 'cached',
      staleTime: Number.POSITIVE_INFINITY,
      meta: { privateCandidateSearch: true },
    });

    const unsubscribePrivate = privateObserver.subscribe(() => {});

    const hook = await renderHook(() => useQueryCandidateSearchSync('org-1'), { wrapper });

    await vi.waitFor(() => expect(hook.result.current.status?.phase).toBe('ready'));

    expect(load).not.toHaveBeenCalled();

    await hook.result.current.refresh();

    expect(load).not.toHaveBeenCalled();

    await client
      .getMutationCache()
      .build(client, { mutationFn: async () => null })
      .execute(undefined);

    expect(mocks.sync).toHaveBeenCalledTimes(2);

    mocks.sync.mockResolvedValue({ ...ready, head: '1' });
    await hook.result.current.refresh();
    await vi.waitFor(() => expect(load).toHaveBeenCalledOnce());
    await hook.result.current.refresh();

    expect(load).toHaveBeenCalledOnce();
    expect(scan).not.toHaveBeenCalled();

    unsubscribe();
    unsubscribePrivate();
    await hook.unmount();
    client.clear();
  });

  it('continues bounded preparation promptly, then switches to ready polling', async () => {
    const first = Promise.withResolvers<CandidateSearchSyncStatus>();
    mocks.sync.mockReturnValueOnce(first.promise).mockResolvedValueOnce(syncing).mockResolvedValue(ready);
    const { client, wrapper } = harness();

    const hook = await renderHook(() => useQueryCandidateSearchSync('org-1'), { wrapper });

    await vi.waitFor(() => expect(mocks.sync).toHaveBeenCalledOnce());
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    first.resolve(syncing);

    await vi.waitFor(() => expect(hook.result.current.status?.phase).toBe('ready'));

    expect(mocks.sync).toHaveBeenCalledTimes(3);

    await vi.advanceTimersByTimeAsync(59_000);

    expect(mocks.sync).toHaveBeenCalledTimes(3);

    await vi.advanceTimersByTimeAsync(1_100);

    expect(mocks.sync).toHaveBeenCalledTimes(4);

    await hook.unmount();
    client.clear();
  });

  it('does not poll during an outstanding pass and cancels it when unmounted', async () => {
    const first = Promise.withResolvers<CandidateSearchSyncStatus>();
    mocks.sync.mockReturnValue(first.promise);

    const { client, wrapper } = harness();

    const hook = await renderHook(() => useQueryCandidateSearchSync('org-1'), { wrapper });

    await vi.waitFor(() => expect(mocks.sync).toHaveBeenCalledOnce());
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    await vi.advanceTimersByTimeAsync(5_000);

    expect(mocks.sync).toHaveBeenCalledOnce();

    await hook.unmount();

    expect(mocks.sync.mock.calls[0][0].aborted).toBe(true);
    expect(mocks.dispose).toHaveBeenCalledOnce();

    first.resolve(syncing);
    await vi.advanceTimersByTimeAsync(20_000);

    expect(mocks.sync).toHaveBeenCalledOnce();

    client.clear();
  });
});

function directoryRows(count: number): CandidateSearchListRow[] {
  return Array.from({ length: count }, (_, index) => ({
    candidateId: `candidate-${index}`,
    profileRevision: 1,
    profileFingerprint: null,
    profile: null,
    firstSeenAt: '2026-01-01T00:00:00Z',
    matchedApplication: null,
    tagIds: [],
  }));
}

function listResponse(rows: CandidateSearchListRow[], nextCursor: string | null) {
  return {
    mode: 'list',
    data: rows,
    pagination: { hasMore: nextCursor !== null, nextCursor },
    coverage: { professional: 'not_requested' },
    retrieval: 'exact',
  };
}

function scanResponse(rows: CandidateSearchListRow[], nextCursor: string | null) {
  return {
    ...listResponse(rows, nextCursor),
    mode: 'scan',
    profileCorpus: { scopeToken: 'scope', head: '0' },
    queryScopeToken: 'query-scope',
  };
}

describe('Candidate directory infinite loading', () => {
  it('refreshes server metadata on focus and after an application mutation without a profile journal event', async () => {
    const rows = directoryRows(1);
    mocks.query.mockResolvedValue(listResponse(rows, null));
    const { client, wrapper } = harness();
    const definition = candidateDefinition([], '');

    const hook = await renderHook(() => useQueryCandidateDirectory('org-1', definition, 'metadata'), { wrapper });

    await vi.waitFor(() => expect(hook.result.current.rows).toEqual(rows));

    const updated = [{ ...rows[0], tagIds: ['tag-1'] }];
    mocks.query.mockResolvedValue(listResponse(updated, null));
    const clock = vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 31_000);

    try {
      focusManager.setFocused(false);
      focusManager.setFocused(true);

      await vi.waitFor(() => expect(hook.result.current.rows).toEqual(updated));

      mocks.query.mockResolvedValue(listResponse(rows, null));
      invalidateApplicationPipelineStatus(client, 'application-1', 'job-1');

      await vi.waitFor(() => expect(hook.result.current.rows).toEqual(rows));

      expect(mocks.query).toHaveBeenCalledTimes(3);
    } finally {
      clock.mockRestore();
      await hook.unmount();
      client.clear();
    }
  });

  it('keeps a private continuation intact when focus returns', async () => {
    pageSync.runtime = true;
    pageSync.ready = true;
    const rows = directoryRows(1);

    mocks.evaluate.mockImplementation(
      async (_index: CandidateSearchHandle, _filter: CandidateSearchFilter, references: CandidateSearchReference[]) =>
        references.map((row) => ({ candidateId: row.candidateId, outcome: 'match' })),
    );

    mocks.query.mockResolvedValue(scanResponse(rows, null));
    const { client, wrapper } = harness();
    const definition = candidateDefinition([], 'Private Name');

    const hook = await renderHook(() => useQueryCandidateDirectory('org-1', definition, 'private-focus'), { wrapper });

    await vi.waitFor(() => expect(hook.result.current.rows).toHaveLength(1));

    focusManager.setFocused(false);
    focusManager.setFocused(true);
    await hook.rerender();

    expect(mocks.query).toHaveBeenCalledOnce();

    await hook.unmount();
    client.clear();
  });

  it('appends server pages once and preserves loaded rows when the next page fails', async () => {
    const rows = directoryRows(70);
    mocks.query.mockResolvedValueOnce(listResponse(rows.slice(0, 50), '50'));
    const { client, wrapper } = harness();
    const definition = candidateDefinition([], '');

    const hook = await renderHook(() => useQueryCandidateDirectory('org-1', definition, 'request-1'), { wrapper });

    await vi.waitFor(() => expect(hook.result.current.rows).toHaveLength(50));
    mocks.query.mockRejectedValueOnce(new Error('Unavailable'));
    hook.result.current.next();
    await vi.waitFor(() => expect(hook.result.current.isFetchNextPageError).toBe(true));

    expect(hook.result.current.rows).toEqual(rows.slice(0, 50));

    const next = Promise.withResolvers<unknown>();
    mocks.query.mockReturnValueOnce(next.promise);
    hook.result.current.next();
    hook.result.current.next();
    await vi.waitFor(() => expect(mocks.query).toHaveBeenCalledTimes(3));
    next.resolve(listResponse(rows.slice(50), null));

    await vi.waitFor(() => expect(hook.result.current.rows).toEqual(rows));

    expect(mocks.query.mock.calls[2][1].cursor).toBe('50');
    expect(hook.result.current.hasNextPage).toBe(false);

    await hook.unmount();
    client.clear();
  });

  it('retries a private next page without losing or duplicating retained matches', async () => {
    pageSync.runtime = true;
    pageSync.ready = true;
    const rows = directoryRows(70);

    mocks.evaluate.mockImplementation(
      async (_index: CandidateSearchHandle, _filter: CandidateSearchFilter, references: CandidateSearchReference[]) =>
        references.map((row) => ({ candidateId: row.candidateId, outcome: 'match' })),
    );

    mocks.query.mockResolvedValue(scanResponse(rows, null));
    const { client, wrapper } = harness();
    const definition = candidateDefinition([], 'Private Name');

    const hook = await renderHook(() => useQueryCandidateDirectory('org-1', definition, 'private-tail'), { wrapper });

    await vi.waitFor(() => expect(hook.result.current.rows).toHaveLength(50));
    mocks.query.mockRejectedValueOnce(new Error('Unavailable'));
    hook.result.current.next();
    await vi.waitFor(() => expect(hook.result.current.isFetchNextPageError).toBe(true));
    hook.result.current.next();
    await vi.waitFor(() => expect(hook.result.current.rows).toHaveLength(70));

    expect(hook.result.current.rows.map((row) => row.candidateId)).toEqual(rows.map((row) => row.candidateId));
    expect(hook.result.current.hasNextPage).toBe(false);

    await hook.unmount();
    client.clear();
  });

  it('aborts a pending private directory request when the account locks', async () => {
    pageSync.runtime = true;
    pageSync.ready = true;
    mocks.query.mockImplementation(() => new Promise(() => {}));
    const { client, wrapper } = harness();
    const definition = candidateDefinition([], 'Private Name');

    const hook = await renderHook(() => useQueryCandidateDirectory('org-1', definition, 'lock-1'), { wrapper });

    await vi.waitFor(() => expect(mocks.query).toHaveBeenCalledOnce());
    const signal: AbortSignal = mocks.query.mock.calls[0][2];
    pageSync.unlocked = false;
    await hook.rerender();

    expect(signal.aborted).toBe(true);
    expect(hook.result.current.rows).toEqual([]);

    await hook.unmount();
    client.clear();
  });

  it('consumes partial private scan pages without duplicates and rebuilds from the start on refresh', async () => {
    pageSync.runtime = true;
    pageSync.ready = true;
    const rows = directoryRows(70);

    mocks.evaluate.mockImplementation(
      async (_index: CandidateSearchHandle, _filter: CandidateSearchFilter, references: CandidateSearchReference[]) =>
        references.map((row) => ({ candidateId: row.candidateId, outcome: 'match' })),
    );

    mocks.query.mockImplementation(async (_org: string, input: ServerCandidateQuery) => {
      const offset = Number(input.cursor ?? 0);

      return scanResponse(rows.slice(offset, offset + 1), offset < rows.length - 1 ? String(offset + 1) : null);
    });

    const { client, wrapper } = harness();
    const definition = candidateDefinition([], 'Private Name');

    const hook = await renderHook(() => useQueryCandidateDirectory('org-1', definition, 'private-1'), { wrapper });

    await vi.waitFor(() => expect(hook.result.current.rows).toHaveLength(32));

    expect(mocks.query).toHaveBeenCalledTimes(32);

    hook.result.current.next();
    await vi.waitFor(() => expect(hook.result.current.rows).toHaveLength(64));
    hook.result.current.next();
    await vi.waitFor(() => expect(hook.result.current.rows).toHaveLength(70));

    const ids = rows.map((row) => row.candidateId);

    expect(hook.result.current.rows.map((row) => row.candidateId)).toEqual(ids);
    expect(hook.result.current.hasNextPage).toBe(false);
    expect(JSON.stringify(mocks.query.mock.calls)).not.toContain('Private Name');

    const calls = mocks.query.mock.calls.length;
    await hook.result.current.refetch();

    expect(mocks.query.mock.calls[calls][1].cursor).toBeUndefined();
    expect(hook.result.current.rows.map((row) => row.candidateId)).toEqual(ids);

    await hook.unmount();
    client.clear();
  });
});

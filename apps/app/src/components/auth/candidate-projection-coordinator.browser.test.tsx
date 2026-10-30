import { onlineManager, QueryClient, QueryClientProvider, QueryObserver } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, onTestFinished, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { qk } from '@/hooks/query-keys';
import { runCandidateProjectionPass } from '@/lib/candidates/run-projections';
import { mockVaultAccess } from '@/test/crypto-helpers';
import { CandidateProjectionCoordinator } from './candidate-projection-coordinator';

const state = vi.hoisted(() => ({
  active: true,
  userId: 'user-1',
  access: true,
  workAvailable: false,
  syncVersion: 1,
}));

vi.mock('@comitium/auth/use-is-crypto-active', () => ({ useIsCryptoActive: () => state.active }));

vi.mock('@comitium/auth/use-session', () => ({ useSession: () => ({ user: { id: state.userId } }) }));

vi.mock('@/hooks/queries/use-query-org-vault-access', () => ({
  useQueryOrgVaultAccess: () => ({ isSuccess: state.access, data: mockVaultAccess() }),
}));

vi.mock('@/lib/candidates/run-projections', () => ({ runCandidateProjectionPass: vi.fn() }));

vi.mock('./candidate-search-coordinator', () => ({
  useCandidateSearchSync: () => ({
    status: { projectionWorkAvailable: state.workAvailable },
    updatedAt: state.syncVersion,
    error: null,
  }),
}));

let client: QueryClient;
const empty = { hasMore: false, candidateIds: [], applicationIds: [] };

function view(orgId: string) {
  return (
    <QueryClientProvider client={client}>
      <CandidateProjectionCoordinator orgId={orgId} />
    </QueryClientProvider>
  );
}

beforeEach(() => {
  state.active = true;
  state.userId = 'user-1';
  state.access = true;
  state.workAvailable = true;
  state.syncVersion = 1;
  onlineManager.setOnline(true);
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  vi.mocked(runCandidateProjectionPass).mockResolvedValue(empty);
});

afterEach(() => {
  vi.useRealTimers();
  client.clear();
  onlineManager.setOnline(true);
  vi.clearAllMocks();
});

describe('organization projection lifecycle', () => {
  it('stays idle until sync reports available work and does not poll an empty queue', async () => {
    state.workAvailable = false;
    const page = await render(view('org-1'));

    expect(runCandidateProjectionPass).not.toHaveBeenCalled();

    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    await vi.advanceTimersByTimeAsync(60_000);

    await client
      .getMutationCache()
      .build(client, { mutationFn: async () => null })
      .execute(undefined);

    expect(runCandidateProjectionPass).not.toHaveBeenCalled();

    state.workAvailable = true;
    state.syncVersion += 1;
    await page.rerender(view('org-1'));
    await vi.waitFor(() => expect(runCandidateProjectionPass).toHaveBeenCalledOnce());
    await vi.advanceTimersByTimeAsync(60_000);

    expect(runCandidateProjectionPass).toHaveBeenCalledOnce();
  });

  it('coalesces actual changes without refreshing lists after an empty pass', async () => {
    let criteria = '1/6';
    const load = vi.fn(async () => criteria);

    const [directory, privateSearch] = [false, true].map((privateCandidateSearch) => {
      const read = vi.fn(async () => criteria);

      const observer = new QueryObserver(client, {
        queryKey: qk.candidate.directory('org-1', privateCandidateSearch ? 'private' : 'list'),
        queryFn: read,
        initialData: 'cached',
        staleTime: Number.POSITIVE_INFINITY,
        meta: { privateCandidateSearch },
      });

      onTestFinished(observer.subscribe(() => {}));

      return { read, observer };
    });

    const list = new QueryObserver(client, {
      queryKey: qk.jobs.kanban('job-1', {}),
      queryFn: load,
      initialData: '—',
      staleTime: Number.POSITIVE_INFINITY,
    });

    onTestFinished(list.subscribe(() => {}));

    vi.mocked(runCandidateProjectionPass).mockResolvedValue({ ...empty, hasMore: true, candidateIds: ['candidate-1'] });

    await render(view('org-1'));

    await vi.waitFor(() => expect(list.getCurrentResult().data).toBe('1/6'));

    expect(directory.observer.getCurrentResult().data).toBe('1/6');
    expect(privateSearch.read).not.toHaveBeenCalled();

    const queryKey = qk.org.detail('org-1');

    criteria = '3/6';

    vi.mocked(runCandidateProjectionPass).mockResolvedValue({ ...empty, hasMore: true, candidateIds: ['candidate-2'] });

    await client.refetchQueries({ queryKey });

    expect(load).toHaveBeenCalledOnce();
    expect(list.getCurrentResult().data).toBe('1/6');

    vi.mocked(runCandidateProjectionPass).mockResolvedValue(empty);

    await client.refetchQueries({ queryKey });

    expect(list.getCurrentResult().data).toBe('3/6');
    expect(directory.observer.getCurrentResult().data).toBe('3/6');
    expect(privateSearch.read).not.toHaveBeenCalled();

    criteria = '4/6';

    await client.refetchQueries({ queryKey });

    expect(list.getCurrentResult().data).toBe('3/6');
  });

  it('starts after unlock without a Candidate Sheet and stops when locked', async () => {
    state.active = false;

    const page = await render(view('org-1'));

    expect(runCandidateProjectionPass).not.toHaveBeenCalled();

    state.active = true;

    await page.rerender(view('org-1'));

    await vi.waitFor(() => expect(runCandidateProjectionPass).toHaveBeenCalledOnce());

    let finish!: (value: typeof empty) => void;
    let activeSignal!: AbortSignal;

    vi.mocked(runCandidateProjectionPass).mockImplementationOnce(async (_org, _access, signal) => {
      activeSignal = signal;

      return new Promise((resolve) => {
        finish = resolve;
      });
    });

    void client.invalidateQueries();

    await vi.waitFor(() => expect(activeSignal).toBeDefined());

    state.active = false;

    await page.rerender(view('org-1'));

    await vi.waitFor(() => expect(activeSignal.aborted).toBe(true));

    finish(empty);
  });

  it('cancels the old session on organization/user changes and access loss', async () => {
    const signals: AbortSignal[] = [];

    vi.mocked(runCandidateProjectionPass).mockImplementation(async (_org, _access, signal) => {
      signals.push(signal);

      return new Promise(() => {});
    });

    const page = await render(view('org-1'));

    await vi.waitFor(() => expect(signals).toHaveLength(1));

    await page.rerender(view('org-2'));

    await vi.waitFor(() => expect(signals).toHaveLength(2));

    expect(signals[0].aborted).toBe(true);

    state.userId = 'user-2';

    await page.rerender(view('org-2'));

    await vi.waitFor(() => expect(signals).toHaveLength(3));

    expect(signals[1].aborted).toBe(true);

    state.access = false;

    await page.rerender(view('org-2'));

    await vi.waitFor(() => expect(signals[2].aborted).toBe(true));
  });

  it('cancels an in-flight pass offline and resumes online', async () => {
    let signal!: AbortSignal;

    vi.mocked(runCandidateProjectionPass).mockImplementationOnce(async (_org, _access, current) => {
      signal = current;

      return new Promise(() => {});
    });

    await render(view('org-1'));

    await vi.waitFor(() => expect(signal).toBeDefined());

    onlineManager.setOnline(false);

    await vi.waitFor(() => expect(signal.aborted).toBe(true));

    onlineManager.setOnline(true);

    await vi.waitFor(() => expect(runCandidateProjectionPass).toHaveBeenCalledTimes(2));
  });
});

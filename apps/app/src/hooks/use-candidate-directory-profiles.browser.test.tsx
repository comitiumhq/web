import type {
  CandidateSearchDisplay,
  CandidateSearchFilter,
  CandidateSearchHandle,
  CandidateSearchReference,
} from '@comitium/crypto/candidate-search-protocol';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from 'vitest-browser-react';
import type { CandidateDirectoryRow } from '@/lib/candidates/search/candidate-query';
import type { CandidateSearchEvaluation } from '../../../../packages/crypto/src/worker/candidate-search-query';
import { useCandidateDirectoryProfiles } from './use-candidate-directory-profiles';

interface DisplayProps {
  rows: CandidateDirectoryRow[];
  orgId: string;
}

const mocks = vi.hoisted(() => ({
  unlocked: true,
  access: { version: 1 },
  refresh: vi.fn<() => void>(),
  evaluate:
    vi.fn<
      (
        index: CandidateSearchHandle,
        filter: CandidateSearchFilter,
        rows: CandidateSearchReference[],
      ) => Promise<CandidateSearchEvaluation[]>
    >(),
}));

vi.mock('@comitium/auth/use-is-crypto-active', () => ({ useIsCryptoActive: () => mocks.unlocked }));
vi.mock('@comitium/crypto', () => ({ CryptoProxy: { evaluateCandidateSearchReferences: mocks.evaluate } }));
vi.mock('./queries/use-query-org-vault-access', () => ({ useQueryOrgVaultAccess: () => ({ data: mocks.access }) }));

function rows(count: number, start = 0): CandidateDirectoryRow[] {
  return Array.from({ length: count }, (_, offset) => ({
    candidateId: `0199a000-0000-7000-8000-${(start + offset).toString().padStart(12, '0')}`,
    profileRevision: 1,
    profileFingerprint: null,
    profile: null,
    firstSeenAt: '2026-01-01T00:00:00Z',
    matchedApplication: null,
    tagIds: [],
    searchIndex: { orgId: 'org-1', scopeToken: 'scope-1', generation: 1 },
  }));
}

function match(row: CandidateSearchReference, name = row.candidateId): CandidateSearchEvaluation {
  const displayProfile: CandidateSearchDisplay = {
    firstName: name,
    lastName: null,
    currentTitle: 'Engineer',
    currentCompany: 'Company',
    location: { cityId: 756135, city: 'Warsaw', country: 'PL' },
  };

  return { candidateId: row.candidateId, outcome: 'match', displayProfile };
}

function renderProfiles(values: CandidateDirectoryRow[]) {
  return renderHook(
    (props?: DisplayProps) => {
      if (!props) {
        throw new Error('Display props are required');
      }

      return useCandidateDirectoryProfiles(props.orgId, props.rows, mocks.refresh);
    },
    { initialProps: { rows: values, orgId: 'org-1' } },
  );
}

beforeEach(() => {
  mocks.unlocked = true;
  mocks.access = { version: 1 };
  mocks.evaluate.mockImplementation(async (_index, _filter, values) => values.map((value) => match(value)));
});

afterEach(() => vi.resetAllMocks());

describe('Candidate directory display window', () => {
  it('preserves overlapping names and locations while preparing new rows and reuses recent rows when scrolling back', async () => {
    const values = rows(3);

    const hook = await renderProfiles(values.slice(0, 2));
    await vi.waitFor(() => expect(hook.result.current.profiles?.size).toBe(2));
    const profile = hook.result.current.profiles?.get(values[1].candidateId);
    const next = Promise.withResolvers<CandidateSearchEvaluation[]>();
    mocks.evaluate.mockReturnValueOnce(next.promise);
    await hook.rerender({ orgId: 'org-1', rows: values.slice(1) });

    expect(hook.result.current.profiles?.get(values[1].candidateId)).toEqual(profile);
    expect(hook.result.current.profiles?.has(values[2].candidateId)).toBe(false);

    expect(mocks.evaluate.mock.calls[1][2]).toEqual([
      {
        candidateId: values[2].candidateId,
        profileRevision: 1,
        profileFingerprint: null,
      },
    ]);

    next.resolve([match(values[2])]);
    await vi.waitFor(() => expect(hook.result.current.profiles?.size).toBe(2));
    await hook.rerender({ orgId: 'org-1', rows: values.slice(0, 2) });

    expect(hook.result.current.profiles?.size).toBe(2);
    expect(mocks.evaluate).toHaveBeenCalledTimes(2);

    await hook.unmount();
  });

  it('retains at most 200 recent profiles instead of every visited page', async () => {
    const values = rows(201);

    const hook = await renderProfiles(values.slice(0, 50));
    await vi.waitFor(() => expect(hook.result.current.profiles?.size).toBe(50));

    for (const start of [50, 100, 150, 200]) {
      const window = values.slice(start, start + 50);
      await hook.rerender({ orgId: 'org-1', rows: window });
      await vi.waitFor(() => expect(hook.result.current.profiles?.size).toBe(window.length));
    }

    await hook.rerender({ orgId: 'org-1', rows: [values[1]] });

    expect(hook.result.current.profiles?.size).toBe(1);
    expect(mocks.evaluate).toHaveBeenCalledTimes(5);

    await hook.rerender({ orgId: 'org-1', rows: [values[0]] });
    await vi.waitFor(() => expect(mocks.evaluate).toHaveBeenCalledTimes(6));
    await vi.waitFor(() => expect(hook.result.current.profiles?.size).toBe(1));
    await hook.unmount();
  });

  it('does not reuse a profile after its source revision or ciphertext fingerprint changes', async () => {
    const [value] = rows(1);

    const hook = await renderProfiles([value]);
    await vi.waitFor(() => expect(hook.result.current.profiles?.size).toBe(1));
    const changed = { ...value, profileRevision: 2, profileFingerprint: 'a'.repeat(64) };
    const update = Promise.withResolvers<CandidateSearchEvaluation[]>();
    mocks.evaluate.mockReturnValueOnce(update.promise);
    await hook.rerender({ orgId: 'org-1', rows: [changed] });

    expect(hook.result.current.profiles?.has(value.candidateId)).toBe(false);

    update.resolve([match(changed, 'Updated')]);
    await vi.waitFor(() => expect(hook.result.current.profiles?.get(value.candidateId)?.name).toBe('Updated'));
    await hook.unmount();
  });

  it('refreshes stale offscreen references once instead of marking a valid profile unavailable', async () => {
    const values = rows(151);
    const changedId = values[120].candidateId;
    const hook = await renderProfiles(values.slice(0, 50));

    await vi.waitFor(() => expect(hook.result.current.profiles?.size).toBe(50));

    mocks.evaluate.mockImplementation(async (_index, _filter, references) =>
      references.map((reference) => {
        if (reference.candidateId === changedId && reference.profileRevision === 1) {
          return { candidateId: changedId, outcome: 'hydrate' };
        }

        return match(reference, 'Updated');
      }),
    );

    const window = values.slice(100, 150);
    await hook.rerender({ orgId: 'org-1', rows: window });

    await vi.waitFor(() => expect(hook.result.current.profiles?.size).toBe(49));

    expect(hook.result.current.failed?.has(changedId)).toBe(false);
    expect(mocks.refresh).toHaveBeenCalledOnce();

    await hook.rerender({ orgId: 'org-1', rows: window });

    expect(mocks.refresh).toHaveBeenCalledOnce();

    const refreshed = window.map((row) => {
      if (row.candidateId === changedId) {
        return { ...row, profileRevision: 2, profileFingerprint: 'a'.repeat(64) };
      }

      return row;
    });

    await hook.rerender({ orgId: 'org-1', rows: refreshed });
    await vi.waitFor(() => expect(hook.result.current.profiles?.get(changedId)?.name).toBe('Updated'));

    expect(hook.result.current.failed?.size).toBe(0);
    expect(mocks.refresh).toHaveBeenCalledOnce();

    await hook.unmount();
  });

  it('keeps unreadable profiles as failures without refreshing the search', async () => {
    const [value] = rows(1);
    mocks.evaluate.mockResolvedValueOnce([{ candidateId: value.candidateId, outcome: 'unreadable' }]);
    const hook = await renderProfiles([value]);

    await vi.waitFor(() => expect(hook.result.current.failed?.has(value.candidateId)).toBe(true));

    expect(mocks.refresh).not.toHaveBeenCalled();

    await hook.unmount();
  });

  it('clears retained profiles when the authorized scope changes', async () => {
    const [value] = rows(1);

    const hook = await renderProfiles([value]);
    await vi.waitFor(() => expect(hook.result.current.profiles?.size).toBe(1));
    const changed = { ...value, searchIndex: { orgId: 'org-1', scopeToken: 'scope-2', generation: 2 } };
    await hook.rerender({ orgId: 'org-1', rows: [changed] });
    await vi.waitFor(() => expect(mocks.evaluate).toHaveBeenCalledTimes(2));
    await hook.rerender({ orgId: 'org-1', rows: [value] });
    await vi.waitFor(() => expect(mocks.evaluate).toHaveBeenCalledTimes(3));
    await hook.unmount();
  });

  it.each(['match', 'hydrate'] as const)('ignores late %s after lock', async (outcome) => {
    const [value] = rows(1);
    const old = Promise.withResolvers<CandidateSearchEvaluation[]>();
    mocks.evaluate.mockReturnValueOnce(old.promise);
    const hook = await renderProfiles([value]);
    await vi.waitFor(() => expect(mocks.evaluate).toHaveBeenCalledOnce());
    mocks.unlocked = false;
    await hook.rerender({ orgId: 'org-1', rows: [value] });

    expect(hook.result.current.profiles).toBeUndefined();

    const current = Promise.withResolvers<CandidateSearchEvaluation[]>();
    mocks.evaluate.mockReturnValueOnce(current.promise);
    mocks.unlocked = true;
    await hook.rerender({ orgId: 'org-1', rows: [value] });
    old.resolve([outcome === 'match' ? match(value, 'Stale') : { candidateId: value.candidateId, outcome }]);

    expect(hook.result.current.profiles?.has(value.candidateId)).toBe(false);

    current.resolve([match(value, 'Current')]);
    await vi.waitFor(() => expect(hook.result.current.profiles?.get(value.candidateId)?.name).toBe('Current'));

    expect(mocks.refresh).not.toHaveBeenCalled();

    await hook.unmount();
  });

  it.each(['org', 'access'])('replaces the display cache when %s changes', async (context) => {
    const [value] = rows(1);

    const hook = await renderProfiles([value]);
    await vi.waitFor(() => expect(hook.result.current.profiles?.size).toBe(1));
    const next = Promise.withResolvers<CandidateSearchEvaluation[]>();
    mocks.evaluate.mockReturnValueOnce(next.promise);

    if (context === 'access') {
      mocks.access = { version: 2 };
    }

    const orgId = context === 'org' ? 'org-2' : 'org-1';
    await hook.rerender({ orgId, rows: [value] });

    expect(hook.result.current.profiles?.has(value.candidateId)).toBe(false);

    next.resolve([match(value, 'Fresh')]);
    await vi.waitFor(() => expect(hook.result.current.profiles?.get(value.candidateId)?.name).toBe('Fresh'));
    await hook.unmount();
  });

  it('renders an empty authorized profile as unnamed instead of loading forever', async () => {
    const [value] = rows(1);
    mocks.evaluate.mockResolvedValueOnce([{ candidateId: value.candidateId, outcome: 'match', displayProfile: null }]);
    const hook = await renderProfiles([value]);

    await vi.waitFor(() =>
      expect(hook.result.current.profiles?.get(value.candidateId)?.name).toBe('Unnamed candidate'),
    );

    expect(hook.result.current.failed?.size).toBe(0);

    await hook.unmount();
  });
});

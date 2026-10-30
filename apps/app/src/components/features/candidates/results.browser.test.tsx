import type {
  CandidateSearchFilter,
  CandidateSearchHandle,
  CandidateSearchReference,
} from '@comitium/crypto/candidate-search-protocol';
import type { CandidateQueryResponse, ServerCandidateQuery } from '@comitium/schemas/candidate-search';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import type { CandidateDirectoryRow } from '@/lib/candidates/search/candidate-query';
import { candidateDefinition } from './filters';
import { CandidatesPage } from './index';
import { CandidateResults } from './results';
import { CandidateSearchStateProvider } from './search-state';

vi.mock('@/components/features/candidate-sheet', () => ({ CandidateSheetMount: () => null }));

const mocks = vi.hoisted(() => ({ query: vi.fn(), evaluate: vi.fn() }));
vi.mock('@comitium/auth/use-is-crypto-active', () => ({ useIsCryptoActive: () => true }));
vi.mock('@comitium/auth/use-session', () => ({ useSession: () => ({ user: { id: 'user-1' } }) }));

vi.mock('@/lib/api/candidate-search', () => ({
  queryCandidates: mocks.query,
  hydrateCandidateCorpus: vi.fn(),
  getCandidateFilterOptions: vi.fn(),
}));

vi.mock('@/components/auth/candidate-search-coordinator', () => ({
  useCandidateSearchSync: () => ({
    runtime: { id: 'runtime-1', evaluate: mocks.evaluate },
    status: { phase: 'ready', ready: { index: { orgId: 'org-1', scopeToken: 'scope', generation: 1 } } },
    error: null,
  }),
}));

vi.mock('@/hooks/use-candidate-directory-profiles', () => ({
  useCandidateDirectoryProfiles: (_orgId: string, rows: CandidateDirectoryRow[]) => ({
    profiles: new Map(rows.map((row) => [row.candidateId, { name: row.candidateId, subtitle: null, location: null }])),
    failed: new Set<string>(),
  }),
}));

vi.mock('@/hooks/use-candidate-tags', () => ({
  useCandidateTags: () => ({ tags: [], tagMap: new Map(), isLoading: false, error: null }),
}));

afterEach(() => vi.resetAllMocks());

function scanResponse(candidateId: string): Extract<CandidateQueryResponse, { mode: 'scan' }> {
  return {
    mode: 'scan',
    data: [
      {
        candidateId,
        profileRevision: 1,
        profileFingerprint: null,
        firstSeenAt: '2026-01-01T00:00:00Z',
        matchedApplication: null,
        tagIds: [],
      },
    ],
    pagination: { hasMore: false, nextCursor: null },
    coverage: { professional: 'not_requested' },
    retrieval: 'exact',
    exhaustive: true,
    consistency: 'live_batches',
    profileCorpus: { scopeToken: 'scope', head: '0' },
    queryScopeToken: 'query-scope',
  };
}

describe('Candidate results infinite scroll', () => {
  it('keeps the real table shell while the first page is pending', async () => {
    mocks.query.mockImplementation(() => new Promise(() => {}));
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    const page = await render(
      <QueryClientProvider client={client}>
        <div style={{ height: 400, display: 'flex', flexDirection: 'column' }}>
          <CandidateResults
            orgId="org-1"
            definition={candidateDefinition([], '')}
            requestId="initial"
            restart={vi.fn()}
            clearPrivate={vi.fn()}
            onSelect={vi.fn()}
          />
        </div>
      </QueryClientProvider>,
    );

    const table = page.getByRole('table', { name: 'Candidates', exact: true });

    await expect.element(table).toBeVisible();
    expect(table.element().querySelectorAll('thead th')).toHaveLength(5);
    expect(table.element().closest('[aria-busy]')).toHaveAttribute('aria-busy', 'true');

    expect(table.element().querySelectorAll('tbody tr:first-child td:first-child [data-slot="skeleton"]')).toHaveLength(
      2,
    );

    await expect.element(page.getByText('No candidates yet.', { exact: true })).not.toBeInTheDocument();

    await page.unmount();
    client.clear();
  });

  it('sends one request per search and cancels only the superseded private scan', async () => {
    const pending = Promise.withResolvers<CandidateQueryResponse>();

    mocks.query.mockResolvedValueOnce({
      mode: 'list',
      data: [],
      pagination: { hasMore: false, nextCursor: null },
      coverage: { professional: 'not_requested' },
      retrieval: 'exact',
      exhaustive: true,
      consistency: 'live_batches',
      queryScopeToken: 'query-scope',
    });

    mocks.query.mockReturnValueOnce(pending.promise);
    mocks.query.mockResolvedValueOnce(scanResponse('Current Candidate'));

    mocks.evaluate.mockImplementation(
      async (_index: CandidateSearchHandle, _filter: CandidateSearchFilter, references: CandidateSearchReference[]) =>
        references.map(({ candidateId }) => ({ candidateId, outcome: 'match' })),
    );

    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    const page = await render(
      <StrictMode>
        <QueryClientProvider client={client}>
          <CandidateSearchStateProvider orgId="org-1">
            <CandidatesPage orgId="org-1" />
          </CandidateSearchStateProvider>
        </QueryClientProvider>
      </StrictMode>,
    );

    await expect.element(page.getByText('No candidates yet.', { exact: true })).toBeVisible();
    expect(mocks.query).toHaveBeenCalledOnce();
    expect(mocks.query.mock.calls[0]).toHaveLength(2);
    await expect.element(page.getByRole('group', { name: 'Search mode', exact: true })).not.toBeInTheDocument();
    await expect.element(page.getByRole('button', { name: 'Job is…', exact: true })).not.toBeInTheDocument();

    await page.getByRole('searchbox', { name: 'Search candidates', exact: true }).fill('Old Name');
    await vi.waitFor(() => expect(mocks.query).toHaveBeenCalledTimes(2));
    const previousSignal: AbortSignal = mocks.query.mock.calls[1][2];

    expect(previousSignal.aborted).toBe(false);

    await page.getByRole('searchbox', { name: 'Search candidates', exact: true }).fill('Current Name');

    await expect.element(page.getByRole('cell', { name: 'Current Candidate', exact: true })).toBeVisible();
    expect(mocks.query).toHaveBeenCalledTimes(3);
    expect(previousSignal.aborted).toBe(true);
    expect(mocks.query.mock.calls[2][2].aborted).toBe(false);

    pending.resolve(scanResponse('Old Candidate'));

    await expect.element(page.getByRole('cell', { name: 'Old Candidate', exact: true })).not.toBeInTheDocument();
    expect(JSON.stringify(mocks.query.mock.calls)).not.toContain('Old Name');
    expect(JSON.stringify(mocks.query.mock.calls)).not.toContain('Current Name');
    expect(mocks.query.mock.calls.every(([, input]) => !input.retrieval)).toBe(true);

    await page.unmount();
    client.clear();
  });

  it('keeps applied conditions inside Filters and renders no coverage banners above results', async () => {
    mocks.query.mockResolvedValue({
      mode: 'list',
      data: [],
      pagination: { hasMore: false, nextCursor: null },
      coverage: { professional: 'incomplete' },
      retrieval: 'exact',
    });

    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    const page = await render(
      <QueryClientProvider client={client}>
        <CandidateSearchStateProvider orgId="org-1">
          <CandidatesPage orgId="org-1" />
        </CandidateSearchStateProvider>
      </QueryClientProvider>,
    );

    await expect.element(page.getByText('No matching results found so far.', { exact: true })).toBeVisible();

    await expect
      .element(page.getByText('Some résumés have not been processed. Results may be incomplete.', { exact: true }))
      .not.toBeInTheDocument();

    await page.getByRole('button', { name: 'Filters', exact: true }).click();
    await page.getByRole('combobox', { name: 'Outcome', exact: true }).click();
    await page.getByRole('option', { name: 'Active', exact: true }).click();
    await userEvent.keyboard('{Escape}');
    await page.getByRole('button', { name: 'Apply', exact: true }).click();
    await vi.waitFor(() => expect(mocks.query).toHaveBeenCalledTimes(2));

    expect(mocks.query.mock.calls[1][1].applicationAny).toEqual({
      all: [{ field: 'application.outcome', op: 'in', value: ['active'] }],
    });

    await expect.element(page.getByRole('button', { name: 'Outcome: Active', exact: true })).not.toBeInTheDocument();
    await expect.element(page.getByRole('button', { name: 'Clear all', exact: true })).not.toBeInTheDocument();

    const filtersButton = page.getByRole('button', { name: 'Filters', exact: false });

    await expect.element(filtersButton).toHaveTextContent('1');

    await filtersButton.click();

    await expect.element(page.getByRole('button', { name: 'Remove Active', exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Reset', exact: true }).click();
    await page.getByRole('button', { name: 'Apply', exact: true }).click();
    await vi.waitFor(() => expect(mocks.query).toHaveBeenCalledTimes(3));

    expect(mocks.query.mock.calls[2][1].applicationAny).toBeUndefined();
    await expect.element(page.getByRole('button', { name: 'Filters', exact: true })).toBeVisible();

    await page.unmount();
    client.clear();
  });

  it('automatically crosses empty scan segments after showing an early match', async () => {
    mocks.query.mockImplementation(async (_orgId: string, input: ServerCandidateQuery) => {
      const offset = Number(input.cursor ?? 0);
      const nextCursor = offset < 96 ? String(offset + 1) : null;

      return {
        mode: 'scan',
        data: [
          {
            candidateId: `Candidate ${offset}`,
            profileRevision: 1,
            profileFingerprint: null,
            firstSeenAt: '2026-01-01T00:00:00Z',
            matchedApplication: null,
            tagIds: [],
          },
        ],
        pagination: { hasMore: nextCursor !== null, nextCursor },
        coverage: { professional: 'not_requested' },
        retrieval: 'exact',
        profileCorpus: { scopeToken: 'scope', head: '0' },
        queryScopeToken: 'query-scope',
      };
    });

    mocks.evaluate.mockImplementation(
      async (_index: CandidateSearchHandle, _filter: CandidateSearchFilter, references: CandidateSearchReference[]) =>
        references.map(({ candidateId }) => ({
          candidateId,
          outcome: ['Candidate 0', 'Candidate 96'].includes(candidateId) ? 'match' : 'no_match',
        })),
    );

    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    const screen = await render(
      <QueryClientProvider client={client}>
        <div style={{ height: 400, display: 'flex', flexDirection: 'column' }}>
          <CandidateResults
            orgId="org-1"
            definition={candidateDefinition([], 'Private Name')}
            requestId="private-sparse"
            restart={vi.fn()}
            clearPrivate={vi.fn()}
            onSelect={vi.fn()}
          />
        </div>
      </QueryClientProvider>,
    );

    await expect.element(screen.getByRole('cell', { name: 'Candidate 0', exact: true })).toBeVisible();
    await expect.element(screen.getByRole('cell', { name: 'Candidate 96', exact: true })).toBeVisible();
    expect(mocks.query).toHaveBeenCalledTimes(97);
    expect(screen.getByRole('row').elements()).toHaveLength(3);
    expect(JSON.stringify(mocks.query.mock.calls)).not.toContain('Private Name');

    await screen.unmount();
    client.clear();
  });
});

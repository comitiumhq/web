import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api/client';
import type { OrgTreasuryStatus } from '@/lib/schemas/org';

import { useOrgTreasury } from '../queries/use-org-treasury';

const { useQueryMock } = vi.hoisted(() => ({ useQueryMock: vi.fn() }));

vi.mock('@tanstack/react-query', () => ({ useQuery: useQueryMock }));

type TreasuryQueryState = {
  state: {
    data: OrgTreasuryStatus | undefined;
    error: Error | null;
  };
};

type TreasuryQueryOptions = {
  refetchInterval: (query: TreasuryQueryState) => number | false;
};

const missingProjection: OrgTreasuryStatus = { status: 'missing_projection' };

function latestQueryOptions(): TreasuryQueryOptions {
  const options = useQueryMock.mock.calls.at(-1)?.[0];

  if (!options) {
    throw new Error('Treasury query options were not registered');
  }

  return options as TreasuryQueryOptions;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useOrgTreasury', () => {
  it.each([
    ['server failure', new ApiError(503, 'Temporarily unavailable')],
    ['network failure', new TypeError('Failed to fetch')],
  ])('keeps projection convergence hidden after a transient %s', (_label, error) => {
    useQueryMock.mockReturnValue({ data: missingProjection, error, isLoading: false });

    const result = useOrgTreasury('org-1');
    const options = latestQueryOptions();

    expect(options.refetchInterval({ state: { data: missingProjection, error } })).toBe(2_000);
    expect(result).toEqual({ treasury: null, isLoading: true, error: null });
  });

  it('stops projection convergence and exposes a permanent API failure', () => {
    const error = new ApiError(404, 'Organization not found');
    useQueryMock.mockReturnValue({ data: missingProjection, error, isLoading: false });

    const result = useOrgTreasury('org-1');
    const options = latestQueryOptions();

    expect(options.refetchInterval({ state: { data: missingProjection, error } })).toBe(false);
    expect(result).toEqual({ treasury: null, isLoading: false, error: 'Failed to load treasury wallet' });
  });
});

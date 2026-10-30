import { CryptoProxy } from '@comitium/crypto';
import type { CandidateProjectionItem, CandidateProjectionResult } from '@comitium/crypto/candidate-projections';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { applyCandidateProjections, claimCandidateProjections } from '@/lib/api/candidate-projections';
import { mockVaultAccess } from '@/test/crypto-helpers';
import { runCandidateProjectionPass } from './run-projections';

vi.mock('@/lib/api/candidate-projections', () => ({
  claimCandidateProjections: vi.fn(),
  applyCandidateProjections: vi.fn(),
}));

const item = {
  workId: 'work',
  candidateId: 'candidate',
  applicationId: 'application',
  kind: 'profile_search',
  inputs: { profile: { envelope: { ct: 'ciphertext' } } },
} as unknown as CandidateProjectionItem;

const result = {
  workId: 'work',
  result: { kind: 'profile_search', searchProjection: {} },
} as CandidateProjectionResult;

beforeEach(() => {
  vi.mocked(claimCandidateProjections).mockResolvedValue({ items: [item], hasMore: false, retryAfterMs: 60000 });
  vi.mocked(applyCandidateProjections).mockResolvedValue({
    results: [{ workId: 'work', status: 'applied' }],
    hasMore: false,
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe('bounded Candidate projection pass', () => {
  it.each(['no_change', 'policy_skipped'] as const)(
    'does not invalidate entity data for %s work completion',
    async (kind) => {
      vi.spyOn(CryptoProxy, 'processCandidateProjection').mockResolvedValue({ ...result, result: { kind } });
      const output = await runCandidateProjectionPass('org', mockVaultAccess(), new AbortController().signal);

      expect(output).toMatchObject({ candidateIds: [], applicationIds: [] });
    },
  );
  it('sends ciphertext to the Worker and returns only IDs/cache scheduling information', async () => {
    const process = vi.spyOn(CryptoProxy, 'processCandidateProjection').mockResolvedValue(result);
    const signal = new AbortController().signal;
    const access = mockVaultAccess();
    const output = await runCandidateProjectionPass('org', access, signal);

    expect(process).toHaveBeenCalledWith('org', access, item);
    expect(applyCandidateProjections).toHaveBeenCalledWith('org', [result], signal);
    expect(output).toEqual({ hasMore: false, candidateIds: ['candidate'], applicationIds: ['application'] });
    expect(JSON.stringify(output)).not.toContain('ciphertext');
  });
  it('never publishes late Worker output after cancellation', async () => {
    let finish!: (value: CandidateProjectionResult) => void;

    vi.spyOn(CryptoProxy, 'processCandidateProjection').mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );

    const controller = new AbortController();
    const pending = runCandidateProjectionPass('org', mockVaultAccess(), controller.signal);

    await vi.waitFor(() => expect(finish).toBeTypeOf('function'));

    controller.abort();
    finish(result);

    await expect(pending).rejects.toThrow();

    expect(applyCandidateProjections).not.toHaveBeenCalled();
  });
  it('limits a busy pass to four batches and resumes through the next poll', async () => {
    vi.spyOn(CryptoProxy, 'processCandidateProjection').mockResolvedValue(result);
    vi.mocked(claimCandidateProjections).mockResolvedValue({ items: [item], hasMore: true, retryAfterMs: 0 });

    const output = await runCandidateProjectionPass('org', mockVaultAccess(), new AbortController().signal);

    expect(claimCandidateProjections).toHaveBeenCalledTimes(4);
    expect(output.hasMore).toBe(true);
  });
  it('does not turn network failure into a stored processing error', async () => {
    vi.spyOn(CryptoProxy, 'processCandidateProjection').mockResolvedValue(result);
    vi.mocked(claimCandidateProjections).mockRejectedValue(new TypeError('offline'));

    await expect(runCandidateProjectionPass('org', mockVaultAccess(), new AbortController().signal)).rejects.toThrow(
      'offline',
    );

    expect(applyCandidateProjections).not.toHaveBeenCalled();
  });
});

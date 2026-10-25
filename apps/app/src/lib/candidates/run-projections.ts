import { CryptoProxy, type VaultKeyAccess } from '@comitium/crypto';
import type { CandidateProjectionResult } from '@comitium/crypto/candidate-projections';
import { applyCandidateProjections, claimCandidateProjections } from '@/lib/api/candidate-projections';

/**
 * One bounded pass. Encrypted bundles go straight to the Worker and never enter query cache.
 */
export async function runCandidateProjectionPass(orgId: string, access: VaultKeyAccess, signal: AbortSignal) {
  const candidateIds = new Set<string>();
  const applicationIds = new Set<string>();
  let hasMore = false;

  for (let batch = 0; batch < 4; batch++) {
    signal.throwIfAborted();

    const claim = await claimCandidateProjections(orgId, signal);

    signal.throwIfAborted();

    const results: CandidateProjectionResult[] = [];

    for (const item of claim.items) {
      signal.throwIfAborted();

      const result = await CryptoProxy.processCandidateProjection(orgId, access, item);

      signal.throwIfAborted();
      results.push(result);
    }

    if (results.length === 0) {
      return { hasMore: false, candidateIds: [...candidateIds], applicationIds: [...applicationIds] };
    }

    const applied = await applyCandidateProjections(orgId, results, signal);

    signal.throwIfAborted();

    for (const item of claim.items) {
      const computed = results.find((result) => result.workId === item.workId)?.result;
      const changesData =
        computed && ['profile_search', 'profile_merge', 'form_reporting', 'form_custom_field'].includes(computed.kind);
      const wasApplied = applied.results.some((result) => result.workId === item.workId && result.status === 'applied');

      if (changesData && wasApplied) {
        candidateIds.add(item.candidateId);

        if (item.applicationId) {
          applicationIds.add(item.applicationId);
        }
      }
    }

    hasMore = claim.hasMore || applied.hasMore;

    if (!hasMore) {
      break;
    }
  }

  return { hasMore, candidateIds: [...candidateIds], applicationIds: [...applicationIds] };
}

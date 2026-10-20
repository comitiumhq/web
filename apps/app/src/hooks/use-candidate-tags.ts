import { useIsCryptoActive } from '@comitium/auth/use-is-crypto-active';
import type { VaultKeyAccess } from '@comitium/crypto';
import { CryptoProxy } from '@comitium/crypto';
import { candidateTagContext } from '@comitium/crypto/context';
import { STALE_TIME_DEFAULT } from '@comitium/schemas/api-query-policy';
import { logger } from '@comitium/ui/logger';
import { skipToken, useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useQueryOrgVaultAccess } from '@/hooks/queries/use-query-org-vault-access';
import { qk } from '@/hooks/query-keys';
import { getCandidateTags } from '@/lib/api/candidate-tags';
import { type CandidateTag, type DecryptedCandidateTag, decryptedTagPayloadSchema } from '@/lib/schemas/candidate-tags';
import { isDefined } from '@/lib/utils';

const EMPTY_TAGS: readonly DecryptedCandidateTag[] = [];

export async function decryptTag(
  raw: CandidateTag,
  orgId: string,
  vaultAccess: VaultKeyAccess,
): Promise<DecryptedCandidateTag | null> {
  try {
    const payload = await CryptoProxy.decryptApplication(raw.label, orgId, vaultAccess, candidateTagContext(orgId));
    const parsed = decryptedTagPayloadSchema.safeParse(payload);

    if (!parsed.success) {
      return null;
    }

    return { ...raw, label: parsed.data.label };
  } catch (err) {
    if (import.meta.env.DEV) {
      logger.warn(`Tag decrypt failed: ${raw.id}`, err);
    }

    return null;
  }
}

export async function fetchDecryptedTags(orgId: string, vaultAccess: VaultKeyAccess): Promise<DecryptedCandidateTag[]> {
  const res = await getCandidateTags(orgId, true);
  const results = await Promise.all(res.data.map((raw) => decryptTag(raw, orgId, vaultAccess)));

  return results.filter((t): t is DecryptedCandidateTag => t !== null);
}

export interface UseCandidateTagsResult {
  tags: readonly DecryptedCandidateTag[];
  tagMap: ReadonlyMap<string, DecryptedCandidateTag>;
  isLoading: boolean;
  error: Error | null;
}

export function useCandidateTags(orgId: string): UseCandidateTagsResult {
  const { data: vaultAccess } = useQueryOrgVaultAccess(orgId);
  const isCryptoActive = useIsCryptoActive();

  const { data, isLoading, error } = useQuery({
    queryKey: qk.candidate.tags(orgId),
    queryFn: isCryptoActive && isDefined(vaultAccess) ? () => fetchDecryptedTags(orgId, vaultAccess) : skipToken,
    staleTime: STALE_TIME_DEFAULT,
  });

  const tags = data ?? EMPTY_TAGS;
  const tagMap = useMemo(() => new Map(tags.map((t) => [t.id, t])), [tags]);

  return { tags, tagMap, isLoading, error };
}

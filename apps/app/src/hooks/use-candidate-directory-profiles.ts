import { useIsCryptoActive } from '@comitium/auth/use-is-crypto-active';
import { CryptoProxy, type VaultKeyAccess } from '@comitium/crypto';
import type { CandidateSearchDisplay } from '@comitium/crypto/candidate-search-protocol';
import { candidateProfileContext } from '@comitium/crypto/context';
import { formatCandidateLocation, formatCandidateName } from '@comitium/schemas/candidates';
import { useEffect, useMemo, useState } from 'react';
import type { CandidateDirectoryRow } from '@/lib/candidates/search/candidate-query';
import { parseDecryptedCandidateProfile } from '@/lib/crypto/decrypted-payloads';
import { isDefined } from '@/lib/utils';
import { useQueryOrgVaultAccess } from './queries/use-query-org-vault-access';

const MAX_CACHED_PROFILES = 200;

export interface CandidateDirectoryProfile {
  name: string;
  subtitle: string | null;
  location: string | null;
}

type CandidateDirectoryProfileCache = Map<string, CandidateDirectoryProfile | null>;

export function useCandidateDirectoryProfiles(orgId: string, rows: CandidateDirectoryRow[]) {
  const unlocked = useIsCryptoActive();
  const { data: access } = useQueryOrgVaultAccess(orgId);
  const index = rows.find((row) => row.searchIndex)?.searchIndex;
  const scope = index?.scopeToken;
  const generation = index?.generation;
  const cache = useMemo<CandidateDirectoryProfileCache>(() => new Map(), [orgId, access, unlocked, scope, generation]);
  const [revision, setRevision] = useState(0);

  useEffect(() => () => cache.clear(), [cache]);

  useEffect(() => {
    if (!unlocked || !access) {
      return;
    }

    let cancelled = false;

    /**
     * Keep recently visible profiles ahead of older offscreen entries in the bounded cache.
     */
    for (const row of rows) {
      const key = profileCacheKey(row);

      const profile = cache.get(key);

      if (isDefined(profile)) {
        cache.delete(key);
        cache.set(key, profile);
      }
    }

    const missing = rows.filter((row) => !cache.has(profileCacheKey(row)));

    void (async () => {
      const localRows = missing.filter((row) => row.searchIndex);
      const index = localRows[0]?.searchIndex;

      if (index) {
        try {
          const evaluations = await CryptoProxy.evaluateCandidateSearchReferences(
            index,
            {},
            localRows.map(({ candidateId, profileRevision, profileFingerprint }) => ({
              candidateId,
              profileRevision,
              profileFingerprint,
            })),
          );

          if (cancelled) {
            return;
          }

          for (const [offset, evaluation] of evaluations.entries()) {
            const profile = evaluation.outcome === 'match' ? formatProfile(evaluation.displayProfile) : null;

            cacheProfile(cache, localRows[offset], profile);
          }
        } catch {
          if (cancelled) {
            return;
          }

          for (const row of localRows) {
            cacheProfile(cache, row, null);
          }
        }

        setRevision((value) => value + 1);
      }

      const canonicalRows = missing.filter((row) => !row.searchIndex);
      const profiles = await Promise.all(canonicalRows.map((row) => readCanonicalProfile(orgId, row, access)));

      if (cancelled) {
        return;
      }

      for (const [offset, profile] of profiles.entries()) {
        cacheProfile(cache, canonicalRows[offset], profile);
      }

      if (profiles.length) {
        setRevision((value) => value + 1);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [orgId, rows, access, unlocked, cache]);

  return useMemo(() => {
    if (!unlocked || !access) {
      return { profiles: undefined, failed: undefined };
    }

    const profiles = new Map<string, CandidateDirectoryProfile>();
    const failed = new Set<string>();

    for (const row of rows) {
      const profile = cache.get(profileCacheKey(row));

      if (profile === null) {
        failed.add(row.candidateId);
      } else if (profile) {
        profiles.set(row.candidateId, profile);
      }
    }

    return { profiles, failed };
  }, [rows, cache, revision, unlocked, access]);
}

/**
 * A display value is reusable only for the same ciphertext revision and authorized index generation.
 */
function profileCacheKey(row: CandidateDirectoryRow): string {
  return JSON.stringify([
    row.candidateId,
    row.profileRevision,
    row.profileFingerprint,
    row.searchIndex?.orgId,
    row.searchIndex?.scopeToken,
    row.searchIndex?.generation,
  ]);
}

function cacheProfile(
  cache: CandidateDirectoryProfileCache,
  row: CandidateDirectoryRow,
  profile: CandidateDirectoryProfile | null,
) {
  const key = profileCacheKey(row);
  cache.delete(key);
  cache.set(key, profile);

  while (cache.size > MAX_CACHED_PROFILES) {
    const oldest = cache.keys().next().value;

    if (isDefined(oldest)) {
      cache.delete(oldest);
    }
  }
}

function formatProfile(profile: CandidateSearchDisplay | null): CandidateDirectoryProfile {
  return {
    name:
      formatCandidateName({
        firstName: profile?.firstName?.slice(0, 200) ?? null,
        lastName: profile?.lastName?.slice(0, 200) ?? null,
      }) || 'Unnamed candidate',
    subtitle:
      [profile?.currentTitle?.slice(0, 280), profile?.currentCompany?.slice(0, 280)].filter(Boolean).join(' · ') ||
      null,
    location: formatCandidateLocation(profile?.location ?? null)?.slice(0, 280) || null,
  };
}

async function readCanonicalProfile(
  orgId: string,
  row: CandidateDirectoryRow,
  access: VaultKeyAccess,
): Promise<CandidateDirectoryProfile | null> {
  if (!row.profile) {
    return formatProfile(null);
  }

  try {
    const data = await CryptoProxy.decryptApplication(
      row.profile,
      orgId,
      access,
      candidateProfileContext(orgId, row.candidateId),
    );

    const profile = parseDecryptedCandidateProfile(data);

    return profile ? formatProfile(profile) : null;
  } catch {
    return null;
  }
}

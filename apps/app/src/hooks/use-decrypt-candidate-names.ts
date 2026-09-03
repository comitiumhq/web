import { useIsCryptoActive } from '@comitium/auth/use-is-crypto-active';
import { CryptoProxy } from '@comitium/crypto';
import { candidateProfileContext } from '@comitium/crypto/context';
import type { CandidateProfile } from '@comitium/schemas/candidates';
import type { EncryptedEnvelope, WrappedKey } from '@comitium/schemas/common';
import { useEffect, useMemo, useRef, useState } from 'react';
import { parseDecryptedCandidateProfile } from '@/lib/crypto/decrypted-payloads';

import { useQueryWrappedVaultKey } from './queries/use-query-wrapped-vault-key';

const decryptedProfileCache = new Map<string, CandidateProfile>();

interface HasCandidateProfile {
  candidateId: string | null;
  candidateProfile: EncryptedEnvelope | null;
}

function profileCacheKey(orgId: string, candidateId: string, profile: EncryptedEnvelope): string {
  return `${orgId}:${candidateId}:${profile.ct}`;
}

function getCachedNames(applications: HasCandidateProfile[], orgId: string): Map<string, CandidateProfile> {
  const map = new Map<string, CandidateProfile>();

  for (const app of applications) {
    if (!app.candidateId || !app.candidateProfile?.ct) {
      continue;
    }

    const cached = decryptedProfileCache.get(profileCacheKey(orgId, app.candidateId, app.candidateProfile));

    if (cached) {
      map.set(app.candidateId, cached);
    }
  }

  return map;
}

/**
 * Batch-decrypt candidate profiles from list endpoints.
 *
 * Collects unique (candidateId, profile) pairs, decrypts once per candidate,
 * and returns a Map for O(1) lookup by candidateId.
 *
 * Auto-triggers when CryptoProxy is active (no extra user action needed).
 */
export function useDecryptCandidateNames(
  applications: HasCandidateProfile[],
  orgId: string,
): Map<string, CandidateProfile> {
  const { data: wrappedVaultKey } = useQueryWrappedVaultKey(orgId);
  const isCryptoActive = useIsCryptoActive();
  const [names, setNames] = useState<Map<string, CandidateProfile>>(() =>
    CryptoProxy.isActive() ? getCachedNames(applications, orgId) : new Map(),
  );
  const decryptingRef = useRef<Set<string>>(new Set());
  const orgRef = useRef(orgId);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  const cachedNames = useMemo(() => {
    if (!isCryptoActive) {
      return new Map<string, CandidateProfile>();
    }

    return getCachedNames(applications, orgId);
  }, [applications, isCryptoActive, orgId]);

  const profilesToDecrypt = useMemo(() => {
    const map = new Map<string, { cacheKey: string; profile: EncryptedEnvelope }>();

    for (const app of applications) {
      if (!app.candidateId || !app.candidateProfile?.ct) {
        continue;
      }

      const cacheKey = profileCacheKey(orgId, app.candidateId, app.candidateProfile);

      if (!decryptedProfileCache.has(cacheKey) && !decryptingRef.current.has(cacheKey)) {
        map.set(app.candidateId, { cacheKey, profile: app.candidateProfile });
      }
    }

    return map;
  }, [applications, orgId]);

  useEffect(() => {
    if (orgRef.current === orgId) {
      return;
    }

    orgRef.current = orgId;
    decryptingRef.current.clear();
    setNames(getCachedNames(applications, orgId));
  }, [applications, orgId]);

  useEffect(() => {
    if (!isCryptoActive) {
      decryptedProfileCache.clear();
      decryptingRef.current.clear();
      setNames(new Map());
    }
  }, [isCryptoActive]);

  useEffect(() => {
    if (cachedNames.size === 0) {
      return;
    }

    setNames((prev) => {
      let changed = false;
      const next = new Map(prev);

      for (const [candidateId, profile] of cachedNames) {
        if (next.get(candidateId) !== profile) {
          next.set(candidateId, profile);
          changed = true;
        }
      }

      return changed ? next : prev;
    });
  }, [cachedNames]);

  useEffect(() => {
    if (!isCryptoActive || !wrappedVaultKey || profilesToDecrypt.size === 0) {
      return;
    }

    const entries = Array.from(profilesToDecrypt.entries());
    const effectOrgId = orgId;

    Promise.allSettled(
      entries.map(async ([candidateId, { cacheKey, profile }]) => {
        if (decryptedProfileCache.has(cacheKey) || decryptingRef.current.has(cacheKey)) {
          return null;
        }

        decryptingRef.current.add(cacheKey);

        try {
          const data = await CryptoProxy.decryptApplication(
            profile,
            orgId,
            wrappedVaultKey as WrappedKey,
            candidateProfileContext(orgId, candidateId),
          );

          const decryptedProfile = parseDecryptedCandidateProfile(data);

          if (!decryptedProfile) {
            throw new Error('Decrypted data does not match CandidateProfile shape');
          }

          decryptedProfileCache.set(cacheKey, decryptedProfile);

          return { candidateId, profile: decryptedProfile };
        } catch {
          return null;
        } finally {
          decryptingRef.current.delete(cacheKey);
        }
      }),
    ).then((results) => {
      if (!mountedRef.current || orgRef.current !== effectOrgId) {
        return;
      }

      const newEntries: [string, CandidateProfile][] = [];

      for (const result of results) {
        if (result.status === 'fulfilled' && result.value) {
          newEntries.push([result.value.candidateId, result.value.profile]);
        }
      }

      if (newEntries.length > 0) {
        setNames((prev) => {
          const next = new Map(prev);

          for (const [id, profile] of newEntries) {
            next.set(id, profile);
          }

          return next;
        });
      }
    });
  }, [isCryptoActive, wrappedVaultKey, profilesToDecrypt, orgId]);

  return names;
}

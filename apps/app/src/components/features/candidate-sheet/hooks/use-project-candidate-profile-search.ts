import type { CandidateProfile } from '@comitium/schemas/candidates';
import { CANDIDATE_PROFILE_SEARCH_PROJECTION_VERSION } from '@comitium/schemas/candidates';
import type { WrappedKey } from '@comitium/schemas/common';
import { logger } from '@comitium/ui/logger';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { qk } from '@/hooks/query-keys';
import { projectCandidateProfileSearch as saveCandidateProfileSearch } from '@/lib/api/candidates';
import { projectCandidateProfileSearch } from '@/lib/candidates/profile-search-projection';
import { isDefined } from '@/lib/utils';

interface UseProjectCandidateProfileSearchParams {
  candidateId: string | null;
  orgId: string;
  profile: CandidateProfile | null;
  storedVersion: number | null;
  wrappedVaultKey: WrappedKey | undefined;
  enabled: boolean;
}

export function useProjectCandidateProfileSearch({
  candidateId,
  orgId,
  profile,
  storedVersion,
  wrappedVaultKey,
  enabled,
}: UseProjectCandidateProfileSearchParams) {
  const queryClient = useQueryClient();
  const attemptedCandidateIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (storedVersion === CANDIDATE_PROFILE_SEARCH_PROJECTION_VERSION) {
      attemptedCandidateIdRef.current = candidateId;
      return;
    }

    const projectionInput = getCandidateProfileProjectionInput(enabled, candidateId, profile, wrappedVaultKey);

    if (!isDefined(projectionInput)) {
      return;
    }

    if (attemptedCandidateIdRef.current === projectionInput.candidateId) {
      return;
    }

    const {
      candidateId: projectionCandidateId,
      profile: projectionProfile,
      wrappedVaultKey: projectionVaultKey,
    } = projectionInput;

    attemptedCandidateIdRef.current = projectionCandidateId;
    let cancelled = false;

    projectCandidateProfileSearch(orgId, projectionVaultKey, projectionProfile)
      .then((searchProjection) => saveCandidateProfileSearch(projectionCandidateId, searchProjection))
      .then(() => {
        if (cancelled) {
          return;
        }

        queryClient.invalidateQueries({ queryKey: qk.candidate.detail(projectionCandidateId) });
        queryClient.invalidateQueries({ queryKey: qk.pipeline.candidatesRoot() });
      })
      .catch((error) => {
        if (import.meta.env.DEV) {
          logger.warn(`Candidate profile search projection failed for candidate ${projectionCandidateId}:`, error);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [candidateId, enabled, orgId, profile, queryClient, storedVersion, wrappedVaultKey]);
}

interface CandidateProfileProjectionInput {
  candidateId: string;
  profile: CandidateProfile;
  wrappedVaultKey: WrappedKey;
}

function getCandidateProfileProjectionInput(
  enabled: boolean,
  candidateId: string | null,
  profile: CandidateProfile | null,
  wrappedVaultKey: WrappedKey | undefined,
): CandidateProfileProjectionInput | null {
  if (!enabled) {
    return null;
  }

  if (!isDefined(candidateId)) {
    return null;
  }

  if (!isDefined(profile)) {
    return null;
  }

  if (!isDefined(wrappedVaultKey)) {
    return null;
  }

  return { candidateId, profile, wrappedVaultKey };
}

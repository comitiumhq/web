import {
  CANDIDATE_PROJECTOR_VERSIONS,
  type CandidateProjectionResult,
  candidateProjectionApplyResponseSchema,
  candidateProjectionClaimResponseSchema,
} from '@comitium/crypto/candidate-projections';
import { api } from './client';

export function claimCandidateProjections(orgId: string, signal: AbortSignal) {
  return api.post(
    `/orgs/${orgId}/candidate-projections/claim`,
    { limit: 25, projectorVersions: CANDIDATE_PROJECTOR_VERSIONS },
    candidateProjectionClaimResponseSchema,
    { signal },
  );
}

export function applyCandidateProjections(orgId: string, results: CandidateProjectionResult[], signal: AbortSignal) {
  return api.post(`/orgs/${orgId}/candidate-projections/apply`, { results }, candidateProjectionApplyResponseSchema, {
    signal,
  });
}

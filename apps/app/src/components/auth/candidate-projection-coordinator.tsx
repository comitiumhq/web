import { useQueryCandidateProjections } from '@/hooks/queries/use-query-candidate-projections';

export function CandidateProjectionCoordinator({ orgId }: { orgId: string }) {
  useQueryCandidateProjections(orgId);

  return null;
}

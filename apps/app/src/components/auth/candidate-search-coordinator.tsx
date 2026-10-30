import { createContext, type ReactNode, useContext } from 'react';
import { useQueryCandidateSearchSync } from '@/hooks/queries/use-query-candidate-search-sync';

interface CandidateSearchCoordinatorProps {
  orgId: string;
  children: ReactNode;
}

const Context = createContext<ReturnType<typeof useQueryCandidateSearchSync> | null>(null);

export function CandidateSearchCoordinator({ orgId, children }: CandidateSearchCoordinatorProps) {
  const sync = useQueryCandidateSearchSync(orgId);

  return <Context.Provider value={sync}>{children}</Context.Provider>;
}

export function useCandidateSearchSync() {
  const context = useContext(Context);

  if (!context) {
    throw new Error('Candidate search requires the org coordinator');
  }

  return context;
}

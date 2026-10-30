import { useIsCryptoActive } from '@comitium/auth/use-is-crypto-active';
import { useSession } from '@comitium/auth/use-session';
import { createContext, type Dispatch, type ReactNode, type SetStateAction, useContext, useState } from 'react';
import type { CandidateFilter } from './filters';

interface CandidateSearchState {
  name: string;
  setName: Dispatch<SetStateAction<string>>;
  filters: CandidateFilter[];
  setFilters: Dispatch<SetStateAction<CandidateFilter[]>>;
}

interface CandidateSearchStateScopeProps {
  children: ReactNode;
}

interface CandidateSearchStateProviderProps extends CandidateSearchStateScopeProps {
  orgId: string;
}

const Context = createContext<CandidateSearchState | null>(null);

export function CandidateSearchStateProvider({ orgId, children }: CandidateSearchStateProviderProps) {
  const { user } = useSession();
  const unlocked = useIsCryptoActive();
  const scope = `${orgId}:${user?.id ?? 'signed-out'}:${unlocked}`;

  return <CandidateSearchStateScope key={scope}>{children}</CandidateSearchStateScope>;
}

function CandidateSearchStateScope({ children }: CandidateSearchStateScopeProps) {
  const [name, setName] = useState('');
  const [filters, setFilters] = useState<CandidateFilter[]>([]);

  return <Context.Provider value={{ name, setName, filters, setFilters }}>{children}</Context.Provider>;
}

export function useCandidateSearchState(): CandidateSearchState {
  const context = useContext(Context);

  if (!context) {
    throw new Error('Candidate search state requires the organization provider');
  }

  return context;
}

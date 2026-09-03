import type { ReactNode } from 'react';

import { CandidateProviders } from '@/lib/candidate-providers';

export function CandidateShell({ children }: { children: ReactNode }) {
  return <CandidateProviders>{children}</CandidateProviders>;
}

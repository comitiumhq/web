import type { User } from '@comitium/schemas/auth';
import { createContext, useContext } from 'react';
import type { AccountStage } from './account-stage';

export interface AccountReadiness {
  stage: AccountStage;
  user: User | null;
}

export const AccountReadinessContext = createContext<AccountReadiness | null>(null);

export function useAccountReadiness(): AccountReadiness {
  const context = useContext(AccountReadinessContext);

  if (!context) {
    throw new Error('useAccountReadiness must be used within AccountReadinessProvider');
  }

  return context;
}

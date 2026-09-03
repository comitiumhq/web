import type { ReactNode } from 'react';
import { createContext, useContext } from 'react';

import type { MyOrg } from '@/hooks/queries/use-query-my-orgs';

const JobDetailRouteOrgContext = createContext<MyOrg | null>(null);

interface JobDetailRouteOrgProviderProps {
  org: MyOrg;
  children: ReactNode;
}

export function JobDetailRouteOrgProvider({ org, children }: JobDetailRouteOrgProviderProps) {
  return <JobDetailRouteOrgContext.Provider value={org}>{children}</JobDetailRouteOrgContext.Provider>;
}

export function useJobDetailRouteOrg() {
  const org = useContext(JobDetailRouteOrgContext);

  if (!org) {
    throw new Error('useJobDetailRouteOrg must be used inside JobDetailRouteOrgProvider');
  }

  return org;
}

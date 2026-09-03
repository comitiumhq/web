import { useQueryMyOrgs } from '@/hooks/queries/use-query-my-orgs';
import type { MyOrg } from '@/lib/schemas/org';

/**
 * Get the current org from cached myOrgs query.
 * Use in settings child routes where OrgGuard is already in the parent layout.
 */
export function useCurrentOrg(orgId: string): { org: MyOrg | undefined; isLoading: boolean } {
  const { data: myOrgs, isLoading } = useQueryMyOrgs();
  const org = myOrgs?.find((o) => o.id === orgId);

  return { org, isLoading };
}

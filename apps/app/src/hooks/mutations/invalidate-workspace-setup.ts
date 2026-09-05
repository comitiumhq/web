import type { QueryClient } from '@tanstack/react-query';
import { qk } from '@/hooks/query-keys';

export function invalidateWorkspaceSetup(queryClient: QueryClient, orgId: string) {
  queryClient.invalidateQueries({ queryKey: qk.org.workspaceSetup(orgId), exact: true });
  queryClient.invalidateQueries({ queryKey: qk.org.jobCreationContext(orgId), exact: true });
}

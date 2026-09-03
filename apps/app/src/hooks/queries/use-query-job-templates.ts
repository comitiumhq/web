import { useIsAuthenticated } from '@comitium/auth/use-is-authenticated';

import { STALE_TIME_DEFAULT } from '@comitium/schemas/api-query-policy';
import { keepPreviousData, skipToken, useQuery } from '@tanstack/react-query';
import { qk } from '@/hooks/query-keys';
import { getJobTemplate, getJobTemplates } from '@/lib/api/job-templates';
import type { GetJobTemplatesParams } from '@/lib/schemas/job-templates';
import { isDefined } from '@/lib/utils';

export function useQueryJobTemplates(orgId?: string, params: GetJobTemplatesParams = {}) {
  const isAuthenticated = useIsAuthenticated();

  return useQuery({
    queryKey: qk.templates.jobs(orgId, params),
    queryFn: isAuthenticated && isDefined(orgId) ? () => getJobTemplates(orgId, params) : skipToken,
    staleTime: STALE_TIME_DEFAULT,
    placeholderData: keepPreviousData,
  });
}

export function useQueryJobTemplate(orgId?: string, templateId?: string) {
  const isAuthenticated = useIsAuthenticated();

  return useQuery({
    queryKey: qk.templates.job(orgId, templateId),
    queryFn:
      isAuthenticated && isDefined(orgId) && isDefined(templateId)
        ? () => getJobTemplate(orgId, templateId)
        : skipToken,
    staleTime: STALE_TIME_DEFAULT,
  });
}

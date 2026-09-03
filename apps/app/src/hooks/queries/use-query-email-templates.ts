import { STALE_TIME_DEFAULT } from '@comitium/schemas/api-query-policy';
import { keepPreviousData, skipToken, useQuery } from '@tanstack/react-query';
import { qk } from '@/hooks/query-keys';
import { getApplicationEmailTemplateOptions, getEmailTemplates } from '@/lib/api/email-templates';
import type { EmailTemplateUseCase } from '@/lib/schemas/emails';
import { isDefined } from '@/lib/utils';

/**
 * Fetch email templates for an org.
 * By default only active templates; pass includeArchived=true for all.
 */
export function useQueryEmailTemplates(orgId?: string, includeArchived = false, useCase?: EmailTemplateUseCase) {
  return useQuery({
    queryKey: qk.templates.email(orgId, { includeArchived, useCase }),
    queryFn: isDefined(orgId) ? () => getEmailTemplates(orgId, includeArchived, useCase) : skipToken,
    staleTime: STALE_TIME_DEFAULT,
    placeholderData: keepPreviousData,
    select: (res) => res.data,
  });
}

export function useQueryApplicationEmailTemplateOptions(
  applicationId: string | undefined,
  params: { activityId?: string; useCase?: EmailTemplateUseCase },
) {
  return useQuery({
    queryKey: qk.application.emailTemplateOptions(applicationId, params),
    queryFn: isDefined(applicationId) ? () => getApplicationEmailTemplateOptions(applicationId, params) : skipToken,
    staleTime: STALE_TIME_DEFAULT,
    select: (res) => res.data,
  });
}

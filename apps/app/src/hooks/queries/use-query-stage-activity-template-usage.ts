import { skipToken, useQuery } from '@tanstack/react-query';

import { qk } from '@/hooks/query-keys';
import { getEmailTemplateUsage } from '@/lib/api/email-templates';
import { getInterviewTemplateUsage } from '@/lib/api/interview-templates';

export type StageActivityTemplateKind = 'interview' | 'email';

function usageQueryKey(kind: StageActivityTemplateKind, orgId: string, templateId: string) {
  if (kind === 'interview') {
    return qk.templates.interviewUsage(orgId, templateId);
  }

  return qk.templates.emailUsage(orgId, templateId);
}

function loadUsage(kind: StageActivityTemplateKind, orgId: string, templateId: string) {
  if (kind === 'interview') {
    return getInterviewTemplateUsage(orgId, templateId);
  }

  return getEmailTemplateUsage(orgId, templateId);
}

export function useQueryStageActivityTemplateUsage(
  kind: StageActivityTemplateKind,
  orgId: string,
  templateId: string,
  enabled: boolean,
) {
  return useQuery({
    queryKey: usageQueryKey(kind, orgId, templateId),
    queryFn: enabled ? () => loadUsage(kind, orgId, templateId) : skipToken,
    staleTime: 0,
  });
}

import { successSchema } from '@comitium/schemas/public';
import type { EmailTemplateBody, EmailTemplateUpdateBody, EmailTemplateUseCase } from '@/lib/schemas/emails';
import {
  applicationEmailTemplateOptionsSchema,
  emailTemplateSchema,
  emailTemplatesListSchema,
} from '@/lib/schemas/emails';
import { stageActivityTemplateUsageSchema } from '@/lib/schemas/stage-activity-template-usage';

import { api } from './client';

export function getEmailTemplates(orgId: string, includeArchived = false, useCase?: EmailTemplateUseCase) {
  const params = new URLSearchParams();

  if (includeArchived) {
    params.set('includeArchived', 'true');
  }

  if (useCase) {
    params.set('useCase', useCase);
  }

  const query = params.toString();

  return api.get(`/orgs/${orgId}/email-templates${query ? `?${query}` : ''}`, emailTemplatesListSchema);
}

export function getApplicationEmailTemplateOptions(
  applicationId: string,
  params: { activityId?: string; useCase?: EmailTemplateUseCase },
) {
  const search = new URLSearchParams();

  if (params.activityId) {
    search.set('activityId', params.activityId);
  }

  if (params.useCase) {
    search.set('useCase', params.useCase);
  }

  const query = search.toString();

  return api.get(
    `/applications/${applicationId}/email-template-options${query ? `?${query}` : ''}`,
    applicationEmailTemplateOptionsSchema,
  );
}

export function getEmailTemplateUsage(orgId: string, templateId: string) {
  return api.get(`/orgs/${orgId}/email-templates/${templateId}/usage`, stageActivityTemplateUsageSchema);
}

export function createEmailTemplate(orgId: string, body: EmailTemplateBody) {
  return api.post(`/orgs/${orgId}/email-templates`, body, emailTemplateSchema);
}

export function updateEmailTemplate(orgId: string, templateId: string, body: EmailTemplateUpdateBody) {
  return api.patch(`/orgs/${orgId}/email-templates/${templateId}`, body, emailTemplateSchema);
}

export function archiveEmailTemplate(orgId: string, templateId: string) {
  return api.post(`/orgs/${orgId}/email-templates/${templateId}/archive`, undefined, successSchema);
}

export function restoreEmailTemplate(orgId: string, templateId: string) {
  return api.post(`/orgs/${orgId}/email-templates/${templateId}/restore`, undefined, successSchema);
}

import { formOptionsResponseSchema } from '@comitium/schemas/forms/form-definitions';
import { successSchema } from '@comitium/schemas/public';
import {
  type CreateInterviewTemplateBody,
  interviewTemplateResponseSchema,
  interviewTemplatesListSchema,
  type UpdateInterviewTemplateBody,
} from '@/lib/schemas/interview-templates';
import { stageActivityTemplateUsageSchema } from '@/lib/schemas/stage-activity-template-usage';

import { api } from './client';

export function getInterviewTemplates(orgId: string, includeArchived = false) {
  const params = includeArchived ? '?includeArchived=true' : '';

  return api.get(`/orgs/${orgId}/interview-templates${params}`, interviewTemplatesListSchema);
}

export function getInterviewTemplateFeedbackFormOptions(orgId: string) {
  return api.get(`/orgs/${orgId}/interview-templates/feedback-form-options`, formOptionsResponseSchema);
}

export function getInterviewTemplateUsage(orgId: string, id: string) {
  return api.get(`/orgs/${orgId}/interview-templates/${id}/usage`, stageActivityTemplateUsageSchema);
}

export function createInterviewTemplate(orgId: string, body: CreateInterviewTemplateBody) {
  return api.post(`/orgs/${orgId}/interview-templates`, body, interviewTemplateResponseSchema);
}

export function updateInterviewTemplate(orgId: string, id: string, body: UpdateInterviewTemplateBody) {
  return api.patch(`/orgs/${orgId}/interview-templates/${id}`, body, interviewTemplateResponseSchema);
}

export function archiveInterviewTemplate(orgId: string, id: string) {
  return api.post(`/orgs/${orgId}/interview-templates/${id}/archive`, {}, successSchema);
}

export function restoreInterviewTemplate(orgId: string, id: string) {
  return api.post(`/orgs/${orgId}/interview-templates/${id}/restore`, {}, successSchema);
}

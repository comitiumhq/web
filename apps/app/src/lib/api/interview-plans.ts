import { dataSchema, successSchema } from '@comitium/schemas/public';
import type { TemplateBody } from '@/lib/schemas/pipeline';
import {
  createTemplateResponseSchema,
  interviewPlanSchema,
  interviewPlansSchema,
  interviewPlanUsageSchema,
} from '@/lib/schemas/pipeline';

import { api } from './client';

export function getInterviewPlans(orgId: string, includeArchived = false) {
  const qs = includeArchived ? '?includeArchived=true' : '';

  return api.get(`/orgs/${orgId}/interview-plans${qs}`, interviewPlansSchema);
}

export function getInterviewPlan(orgId: string, planId: string) {
  return api.get(`/orgs/${orgId}/interview-plans/${planId}`, dataSchema(interviewPlanSchema));
}

export function getInterviewPlanUsage(orgId: string, planId: string) {
  return api.get(`/orgs/${orgId}/interview-plans/${planId}/usage`, interviewPlanUsageSchema);
}

export function createInterviewPlan(orgId: string, body: TemplateBody) {
  return api.post(`/orgs/${orgId}/interview-plans`, body, createTemplateResponseSchema);
}

export function updateInterviewPlan(orgId: string, planId: string, body: TemplateBody) {
  return api.put(`/orgs/${orgId}/interview-plans/${planId}`, body, successSchema);
}

export function archiveInterviewPlan(orgId: string, planId: string) {
  return api.post(`/orgs/${orgId}/interview-plans/${planId}/archive`, undefined, successSchema);
}

export function unarchiveInterviewPlan(orgId: string, planId: string) {
  return api.post(`/orgs/${orgId}/interview-plans/${planId}/unarchive`, undefined, successSchema);
}

export function duplicateInterviewPlan(orgId: string, planId: string) {
  return api.post(`/orgs/${orgId}/interview-plans/${planId}/duplicate`, undefined, createTemplateResponseSchema);
}

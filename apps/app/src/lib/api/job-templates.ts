import { successSchema } from '@comitium/schemas/public';
import {
  type CreateDraftFromTemplateBody,
  type CreateJobTemplateBody,
  createDraftFromTemplateResponseSchema,
  createJobTemplateResponseSchema,
  type GetJobTemplatesParams,
  jobTemplateSchema,
  jobTemplatesResponseSchema,
  type UpdateJobTemplateBody,
} from '@/lib/schemas/job-templates';
import { isDefined } from '@/lib/utils';

import { api } from './client';

function buildListQuery(params: GetJobTemplatesParams) {
  const search = new URLSearchParams();

  if (params.status) {
    search.set('status', params.status);
  }

  if (isDefined(params.limit)) {
    search.set('limit', String(params.limit));
  }

  if (params.cursor) {
    search.set('cursor', params.cursor);
  }

  const qs = search.toString();

  return qs ? `?${qs}` : '';
}

export function getJobTemplates(orgId: string, params: GetJobTemplatesParams = {}) {
  return api.get(`/orgs/${orgId}/job-templates${buildListQuery(params)}`, jobTemplatesResponseSchema);
}

export function getJobTemplate(orgId: string, templateId: string) {
  return api.get(`/orgs/${orgId}/job-templates/${templateId}`, jobTemplateSchema);
}

export function createJobTemplate(orgId: string, body: CreateJobTemplateBody) {
  return api.post(`/orgs/${orgId}/job-templates`, body, createJobTemplateResponseSchema);
}

export function updateJobTemplate(orgId: string, templateId: string, body: UpdateJobTemplateBody) {
  return api.patch(`/orgs/${orgId}/job-templates/${templateId}`, body, successSchema);
}

export function activateJobTemplate(orgId: string, templateId: string) {
  return api.post(`/orgs/${orgId}/job-templates/${templateId}/activate`, {}, successSchema);
}

export function deactivateJobTemplate(orgId: string, templateId: string) {
  return api.post(`/orgs/${orgId}/job-templates/${templateId}/deactivate`, {}, successSchema);
}

export function archiveJobTemplate(orgId: string, templateId: string) {
  return api.post(`/orgs/${orgId}/job-templates/${templateId}/archive`, {}, successSchema);
}

export function restoreJobTemplate(orgId: string, templateId: string) {
  return api.post(`/orgs/${orgId}/job-templates/${templateId}/restore`, {}, successSchema);
}

export function createDraftFromTemplate(orgId: string, templateId: string, body: CreateDraftFromTemplateBody) {
  return api.post(`/orgs/${orgId}/jobs/from-template/${templateId}`, body, createDraftFromTemplateResponseSchema);
}

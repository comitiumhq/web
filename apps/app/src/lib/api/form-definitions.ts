import type { FormClass } from '@comitium/schemas/forms';
import {
  adminFormDetailSchema,
  applicationFormUsageSchema,
  type CreateFormBody,
  feedbackFormUsageSchema,
  formDefinitionRowSchema,
  listFormsResponseSchema,
  type UpdateFormBody,
} from '@comitium/schemas/forms/form-definitions';

import { api } from './client';

interface ListParams {
  formClass?: FormClass;
  includeArchived?: boolean;
}

export function getFormsList(orgId: string, params: ListParams = {}) {
  const search = new URLSearchParams();

  if (params.formClass) {
    search.set('formClass', params.formClass);
  }

  if (params.includeArchived) {
    search.set('includeArchived', 'true');
  }

  const qs = search.toString();
  const path = `/orgs/${orgId}/forms${qs ? `?${qs}` : ''}`;

  return api.get(path, listFormsResponseSchema);
}

export function createForm(orgId: string, body: CreateFormBody) {
  return api.post(`/orgs/${orgId}/forms`, body, formDefinitionRowSchema);
}

export function updateForm(orgId: string, formId: string, body: UpdateFormBody) {
  return api.patch(`/orgs/${orgId}/forms/${formId}`, body, adminFormDetailSchema);
}

export function archiveForm(orgId: string, formId: string) {
  return api.post(`/orgs/${orgId}/forms/${formId}/archive`, undefined, formDefinitionRowSchema);
}

export function restoreForm(orgId: string, formId: string) {
  return api.post(`/orgs/${orgId}/forms/${formId}/restore`, undefined, formDefinitionRowSchema);
}

export function getForm(orgId: string, formId: string) {
  return api.get(`/orgs/${orgId}/forms/${formId}`, adminFormDetailSchema);
}

export function getFeedbackFormUsage(orgId: string, formId: string) {
  return api.get(`/orgs/${orgId}/forms/${formId}/usage`, feedbackFormUsageSchema);
}

export function getApplicationFormUsage(orgId: string, formId: string) {
  return api.get(`/orgs/${orgId}/forms/${formId}/usage`, applicationFormUsageSchema);
}

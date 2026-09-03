import {
  type CreateDraftParams,
  createDraftResponseSchema,
  draftJobsResponseSchema,
  type GetOrgJobsParams,
  jobCreationContextSchema,
  jobDraftSchema,
  jobLifecycleMutationResponseSchema,
  jobSummarySchema,
  orgJobsResponseSchema,
  type PrepareJobContentUriUpdateParams,
  type PublishDraftParams,
  prepareJobContentUriUpdateResponseSchema,
  prepareUnpublishSchema,
  publishDraftResponseSchema,
  reopenJobAsDraftResponseSchema,
  type UpdateDraftData,
  updateDraftResponseSchema,
} from '@comitium/schemas/jobs';
import { preparedRelayedOnchainOperationSchema } from '@comitium/schemas/onchain-operations';
import { successSchema } from '@comitium/schemas/public';

import { api } from './client';

export function getJobSummary(id: string) {
  return api.get(`/jobs/${id}/summary`, jobSummarySchema);
}

export function prepareUnpublishJob(jobId: string) {
  return api.post(`/jobs/${jobId}/unpublish/prepare`, undefined, prepareUnpublishSchema);
}

export function prepareJobClose(jobId: string, expectedVersion: number, closeReasonId: string) {
  return api.post(
    `/jobs/${jobId}/close/prepare`,
    { expectedVersion, closeReasonId },
    preparedRelayedOnchainOperationSchema,
  );
}

export function closeJob(jobId: string, expectedVersion: number, closeReasonId: string) {
  return api.post(`/jobs/${jobId}/close`, { expectedVersion, closeReasonId }, jobLifecycleMutationResponseSchema);
}

export function reopenJobAsDraft(jobId: string) {
  return api.post(`/jobs/${jobId}/reopen-as-draft`, undefined, reopenJobAsDraftResponseSchema);
}

// --- Org-scoped jobs ---

function appendOrgJobFilters(
  searchParams: URLSearchParams,
  params: Pick<GetOrgJobsParams, 'search' | 'departmentId' | 'locationId' | 'category'>,
) {
  if (params.search) {
    searchParams.append('search', params.search);
  }

  if (params.departmentId) {
    searchParams.append('departmentId', params.departmentId);
  }

  if (params.locationId) {
    searchParams.append('locationId', params.locationId);
  }

  if (params.category) {
    searchParams.append('category', params.category);
  }
}

export function getOrgJobs(orgId: string, params: GetOrgJobsParams = {}) {
  const searchParams = new URLSearchParams();

  if (params.status) {
    searchParams.append('status', params.status);
  }

  appendOrgJobFilters(searchParams, params);

  if (params.limit) {
    searchParams.append('limit', params.limit.toString());
  }

  if (params.cursor) {
    searchParams.append('cursor', params.cursor);
  }

  const qs = searchParams.toString();

  return api.get(`/orgs/${orgId}/jobs${qs ? `?${qs}` : ''}`, orgJobsResponseSchema);
}

// --- Job Drafts ---

function draftUpdatePayload(data: UpdateDraftData) {
  const { location: _location, ...payload } = data;

  return payload;
}

export function createDraft(orgId: string, data: CreateDraftParams) {
  return api.post(`/orgs/${orgId}/jobs`, data, createDraftResponseSchema);
}

export function getJobCreationContext(orgId: string) {
  return api.get(`/orgs/${orgId}/jobs/creatable-departments`, jobCreationContextSchema);
}

export function getDrafts(orgId: string, params: Omit<GetOrgJobsParams, 'status'> = {}) {
  const searchParams = new URLSearchParams({ status: 'draft' });

  appendOrgJobFilters(searchParams, params);

  if (params.limit) {
    searchParams.append('limit', params.limit.toString());
  }

  if (params.cursor) {
    searchParams.append('cursor', params.cursor);
  }

  return api.get(`/orgs/${orgId}/jobs?${searchParams.toString()}`, draftJobsResponseSchema);
}

export function getDraft(orgId: string, jobId: string) {
  return api.get(`/orgs/${orgId}/jobs/${jobId}`, jobDraftSchema);
}

export function updateDraft(orgId: string, jobId: string, data: UpdateDraftData) {
  return api.patch(`/orgs/${orgId}/jobs/${jobId}`, draftUpdatePayload(data), updateDraftResponseSchema);
}

export function deleteDraft(orgId: string, jobId: string) {
  return api.delete(`/orgs/${orgId}/jobs/${jobId}`, successSchema);
}

export function publishDraft(orgId: string, jobId: string, data: PublishDraftParams) {
  return api.post(`/orgs/${orgId}/jobs/${jobId}/publish/prepare`, data, publishDraftResponseSchema);
}

export function prepareJobContentUriUpdate(orgId: string, jobId: string, data: PrepareJobContentUriUpdateParams) {
  return api.post(`/orgs/${orgId}/jobs/${jobId}/content/prepare`, data, prepareJobContentUriUpdateResponseSchema);
}

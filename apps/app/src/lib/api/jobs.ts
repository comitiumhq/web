import {
  type CreateDraftParams,
  createDraftResponseSchema,
  draftJobsResponseSchema,
  type GetOrgJobsParams,
  jobCreationContextSchema,
  jobEditorSchema,
  jobLifecycleMutationResponseSchema,
  jobPostingSchema,
  jobSummarySchema,
  orgJobsResponseSchema,
  type PrepareCommitmentParams,
  type PrepareJobContentUriUpdateParams,
  type PublishJobPostingData,
  prepareJobContentUriUpdateResponseSchema,
  reopenJobAsDraftResponseSchema,
  type UpdateJobEditorData,
  type UpdateJobPostingData,
  unpublishJobPostingResponseSchema,
  updateJobEditorResponseSchema,
} from '@comitium/schemas/jobs';
import { preparedRelayedOnchainOperationSchema } from '@comitium/schemas/onchain-operations';
import { successSchema } from '@comitium/schemas/public';

import { api } from './client';

export function getJobSummary(id: string) {
  return api.get(`/jobs/${id}/summary`, jobSummarySchema);
}

export function prepareJobSettlement(jobId: string) {
  return api.post(`/jobs/${jobId}/settle/prepare`, {}, preparedRelayedOnchainOperationSchema);
}

export function closeJob(jobId: string, expectedVersion: number, closeReasonId: string) {
  return api.post(`/jobs/${jobId}/close`, { expectedVersion, closeReasonId }, jobLifecycleMutationResponseSchema);
}

export function prepareJobClose(jobId: string, expectedVersion: number, closeReasonId: string) {
  return api.post(
    `/jobs/${jobId}/close/prepare`,
    { expectedVersion, closeReasonId },
    preparedRelayedOnchainOperationSchema,
  );
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

function jobEditorUpdatePayload(data: UpdateJobEditorData) {
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

export function getJobEditor(orgId: string, jobId: string) {
  return api.get(`/orgs/${orgId}/jobs/${jobId}`, jobEditorSchema);
}

export function updateJobEditor(orgId: string, jobId: string, data: UpdateJobEditorData) {
  return api.patch(`/orgs/${orgId}/jobs/${jobId}`, jobEditorUpdatePayload(data), updateJobEditorResponseSchema);
}

export function deleteDraft(orgId: string, jobId: string) {
  return api.delete(`/orgs/${orgId}/jobs/${jobId}`, successSchema);
}

export function prepareJobContentUriUpdate(orgId: string, jobId: string, data: PrepareJobContentUriUpdateParams) {
  return api.post(`/orgs/${orgId}/jobs/${jobId}/content/prepare`, data, prepareJobContentUriUpdateResponseSchema);
}

// --- Job Posting ---

export function getJobPosting(orgId: string, jobId: string) {
  return api.get(`/orgs/${orgId}/jobs/${jobId}/posting`, jobPostingSchema);
}

export function updateJobPosting(orgId: string, jobId: string, data: UpdateJobPostingData) {
  return api.patch(`/orgs/${orgId}/jobs/${jobId}/posting`, data, jobPostingSchema);
}

export function publishJobPosting(orgId: string, jobId: string, data: PublishJobPostingData) {
  return api.post(`/orgs/${orgId}/jobs/${jobId}/posting/publish`, data, jobPostingSchema);
}

export function unpublishJobPosting(orgId: string, jobId: string, expectedVersion: number) {
  return api.post(
    `/orgs/${orgId}/jobs/${jobId}/posting/unpublish`,
    { expectedVersion },
    unpublishJobPostingResponseSchema,
  );
}

export function prepareCommitment(orgId: string, jobId: string, data: PrepareCommitmentParams) {
  return api.post(`/orgs/${orgId}/jobs/${jobId}/commitment/prepare`, data, preparedRelayedOnchainOperationSchema);
}

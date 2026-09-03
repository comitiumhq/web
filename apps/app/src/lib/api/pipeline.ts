import type { PipelineCandidatesFilters, PipelineJobsFilters } from '@/lib/schemas/pipeline';
import { pipelineCandidatesSchema, pipelineJobsSchema, pipelineSummarySchema } from '@/lib/schemas/pipeline';
import { isDefined } from '@/lib/utils';

import { api } from './client';

export function getPipelineSummary(orgId: string) {
  return api.get(`/orgs/${orgId}/pipeline/summary`, pipelineSummarySchema);
}

function buildPipelineJobsQuery(filters: PipelineJobsFilters): string {
  const params = new URLSearchParams();

  if (filters.stageType) {
    params.set('stageType', filters.stageType);
  }

  if (filters.skill) {
    params.set('skill', filters.skill);
  }

  if (filters.tagIds && filters.tagIds.length > 0) {
    params.set('tagIds', filters.tagIds.join(','));
  }

  if (isDefined(filters.minCriteriaMet)) {
    params.set('minCriteriaMet', String(filters.minCriteriaMet));
  }

  if (filters.q) {
    params.set('q', filters.q);
  }

  if (filters.limit) {
    params.set('limit', String(filters.limit));
  }

  if (filters.cursor) {
    params.set('cursor', filters.cursor);
  }

  const qs = params.toString();

  return qs ? `?${qs}` : '';
}

export function getPipelineJobs(orgId: string, filters: PipelineJobsFilters = {}) {
  return api.get(`/orgs/${orgId}/pipeline/jobs${buildPipelineJobsQuery(filters)}`, pipelineJobsSchema);
}

function buildPipelineCandidatesQuery(filters: PipelineCandidatesFilters): string {
  const params = new URLSearchParams();

  if (filters.stageType) {
    params.set('stageType', filters.stageType);
  }

  if (filters.view) {
    params.set('view', filters.view);
  }

  if (isDefined(filters.assignedToMe)) {
    params.set('assignedToMe', String(filters.assignedToMe));
  }

  if (filters.skill) {
    params.set('skill', filters.skill);
  }

  if (filters.tagIds && filters.tagIds.length > 0) {
    params.set('tagIds', filters.tagIds.join(','));
  }

  if (isDefined(filters.minCriteriaMet)) {
    params.set('minCriteriaMet', String(filters.minCriteriaMet));
  }

  if (filters.q) {
    params.set('q', filters.q);
  }

  if (filters.sort) {
    params.set('sort', filters.sort);
  }

  if (filters.direction) {
    params.set('direction', filters.direction);
  }

  if (filters.responseStatus) {
    params.set('responseStatus', filters.responseStatus);
  }

  if (filters.limit) {
    params.set('limit', String(filters.limit));
  }

  if (filters.cursor) {
    params.set('cursor', filters.cursor);
  }

  const qs = params.toString();

  return qs ? `?${qs}` : '';
}

export function getPipelineCandidates(orgId: string, filters: PipelineCandidatesFilters = {}) {
  return api.get(
    `/orgs/${orgId}/pipeline/candidates${buildPipelineCandidatesQuery(filters)}`,
    pipelineCandidatesSchema,
  );
}

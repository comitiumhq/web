import { type HiringTeamRole, hiringTeamMemberSchema, myJobAccessSchema } from '@comitium/schemas/jobs';
import { dataArraySchema, successSchema } from '@comitium/schemas/public';
import type { KanbanFilters } from '@/lib/schemas/pipeline';
import { archivedKanbanSchema, kanbanSchema, pipelineSchema } from '@/lib/schemas/pipeline';
import { isDefined } from '@/lib/utils';

import { api } from './client';

export function getPipeline(jobId: string) {
  return api.get(`/jobs/${jobId}/pipeline`, pipelineSchema);
}

function buildKanbanUrl(jobId: string, filters: KanbanFilters): string {
  const params = new URLSearchParams();

  if (filters.stage) {
    params.set('stage', filters.stage);
  }

  if (filters.cursor) {
    params.set('cursor', filters.cursor);
  }

  if (filters.limit) {
    params.set('limit', String(filters.limit));
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

  const qs = params.toString();

  return `/jobs/${jobId}/kanban${qs ? `?${qs}` : ''}`;
}

export function getKanban(jobId: string, filters: KanbanFilters = {}) {
  return api.get(buildKanbanUrl(jobId, filters), kanbanSchema);
}

export function getArchivedKanban(jobId: string, params: { cursor?: string; limit?: number } = {}) {
  const search = new URLSearchParams();

  if (params.cursor) {
    search.set('cursor', params.cursor);
  }

  if (params.limit) {
    search.set('limit', String(params.limit));
  }

  const query = search.toString();

  return api.get(`/jobs/${jobId}/kanban/archived${query ? `?${query}` : ''}`, archivedKanbanSchema);
}

export function getHiringTeam(jobId: string) {
  return api.get(`/jobs/${jobId}/hiring-team`, dataArraySchema(hiringTeamMemberSchema)).then((res) => res.data);
}

export function getMyJobAccess(jobId: string) {
  return api.get(`/jobs/${jobId}/access/me`, myJobAccessSchema).then((res) => res.data);
}

export function addHiringTeamMember(jobId: string, userId: string, role: HiringTeamRole) {
  return api.post(`/jobs/${jobId}/hiring-team`, { userId, role }, successSchema);
}

export function updateHiringTeamMemberRole(jobId: string, userId: string, role: HiringTeamRole) {
  return api.patch(`/jobs/${jobId}/hiring-team/${userId}`, { role }, successSchema);
}

export function removeHiringTeamMember(jobId: string, userId: string) {
  return api.delete(`/jobs/${jobId}/hiring-team/${userId}`, successSchema);
}

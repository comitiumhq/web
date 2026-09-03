import { successSchema } from '@comitium/schemas/public';
import type {
  CreateStageActivityBody,
  StageActivityOwner,
  UpdateStageActivityBody,
} from '@/lib/schemas/stage-activities';
import {
  activityOptionsSchema,
  stageActivitiesListSchema,
  stageActivityResponseSchema,
} from '@/lib/schemas/stage-activities';

import { api } from './client';

export function getStageActivities(jobId: string, stageId: string) {
  return api.get(`/jobs/${jobId}/stages/${stageId}/activities`, stageActivitiesListSchema);
}

function ownerActivitiesPath(owner: StageActivityOwner): string {
  if (owner.kind === 'job') {
    return `/jobs/${owner.jobId}/activities`;
  }

  return `/orgs/${owner.orgId}/job-templates/${owner.templateId}/activities`;
}

function ownerActivityOptionsPath(owner: StageActivityOwner): string {
  if (owner.kind === 'job') {
    return `/jobs/${owner.jobId}/activity-options`;
  }

  return `/orgs/${owner.orgId}/job-templates/${owner.templateId}/activity-options`;
}

function ownerStageActivitiesPath(owner: StageActivityOwner, stageId: string): string {
  if (owner.kind === 'job') {
    return `/jobs/${owner.jobId}/stages/${stageId}/activities`;
  }

  return `/orgs/${owner.orgId}/job-templates/${owner.templateId}/stages/${stageId}/activities`;
}

export function getOwnerActivities(owner: StageActivityOwner) {
  return api.get(ownerActivitiesPath(owner), stageActivitiesListSchema);
}

export function getOwnerActivityOptions(owner: StageActivityOwner) {
  return api.get(ownerActivityOptionsPath(owner), activityOptionsSchema);
}

export function createOwnerActivity(owner: StageActivityOwner, stageId: string, body: CreateStageActivityBody) {
  return api.post(ownerStageActivitiesPath(owner, stageId), body, stageActivityResponseSchema);
}

export function updateOwnerActivity(owner: StageActivityOwner, activityId: string, body: UpdateStageActivityBody) {
  return api.patch(`${ownerActivitiesPath(owner)}/${activityId}`, body, stageActivityResponseSchema);
}

export function deleteOwnerActivity(owner: StageActivityOwner, activityId: string) {
  return api.delete(`${ownerActivitiesPath(owner)}/${activityId}`, successSchema);
}

export function reorderOwnerActivities(owner: StageActivityOwner, stageId: string, activityIds: string[]) {
  return api.patch(`${ownerStageActivitiesPath(owner, stageId)}/reorder`, { activityIds }, successSchema);
}

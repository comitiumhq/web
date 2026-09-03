import {
  type CandidateIdentityInput,
  type CreateCandidateBody,
  candidateApplicationTargetsResponseSchema,
  candidateFileFinalizeResponseSchema,
  candidateFileReservationResponseSchema,
  candidateFilesResponseSchema,
  candidateFileUploadResponseSchema,
  candidateNotesResponseSchema,
  candidateProfileUpdateResponseSchema,
  candidateSchema,
  considerCandidateForJobResponseSchema,
  createCandidateResponseSchema,
  createNoteResponseSchema,
  deleteNoteResponseSchema,
  resolveCandidateResponseSchema,
} from '@comitium/schemas/candidates';
import type { EncryptedEnvelope } from '@comitium/schemas/common';
import { activityFeedResponseSchema } from '@/lib/schemas/emails';

import { api } from './client';
import { buildCursorSearchParams, DEFAULT_CURSOR_PAGE_SIZE } from './cursor-pagination';

export function getCandidate(candidateId: string) {
  return api.get(`/candidates/${candidateId}`, candidateSchema);
}

export function getCandidateApplicationTargets(
  candidateId: string,
  filters: { search?: string; limit?: number; cursor?: string },
) {
  const params = buildCursorSearchParams(filters.limit ?? DEFAULT_CURSOR_PAGE_SIZE, filters.cursor);

  if (filters.search) {
    params.set('search', filters.search);
  }

  return api.get(
    `/candidates/${candidateId}/application-targets?${params.toString()}`,
    candidateApplicationTargetsResponseSchema,
  );
}

export function considerCandidateForJob(candidateId: string, jobId: string) {
  return api.post(
    `/candidates/${candidateId}/applications`,
    { jobId, origin: 'recruiter_add' },
    considerCandidateForJobResponseSchema,
  );
}

export function updateCandidateProfile(candidateId: string, profile: EncryptedEnvelope) {
  return api.patch(`/candidates/${candidateId}/profile`, { profile }, candidateProfileUpdateResponseSchema);
}

export function resolveCandidate(orgId: string, identities: CandidateIdentityInput[]) {
  return api.post(`/orgs/${orgId}/candidates/resolve`, { identities }, resolveCandidateResponseSchema);
}

export function createCandidate(orgId: string, body: CreateCandidateBody) {
  return api.post(`/orgs/${orgId}/candidates`, body, createCandidateResponseSchema);
}

export function createNote(candidateId: string, content: EncryptedEnvelope, mentions: string[], isPrivate: boolean) {
  return api.post(`/candidates/${candidateId}/notes`, { content, mentions, isPrivate }, createNoteResponseSchema);
}

export function getCandidateNotes(candidateId: string, limit = DEFAULT_CURSOR_PAGE_SIZE, cursor?: string) {
  const params = buildCursorSearchParams(limit, cursor);

  return api.get(`/candidates/${candidateId}/notes?${params.toString()}`, candidateNotesResponseSchema);
}

export function getCandidateActivity(
  candidateId: string,
  applicationId: string,
  limit = DEFAULT_CURSOR_PAGE_SIZE,
  cursor?: string,
) {
  const params = buildCursorSearchParams(limit, cursor);

  params.set('applicationId', applicationId);

  return api.get(`/candidates/${candidateId}/activity?${params.toString()}`, activityFeedResponseSchema);
}

export function deleteNote(candidateId: string, noteId: string) {
  return api.delete(`/candidates/${candidateId}/notes/${noteId}`, deleteNoteResponseSchema);
}

export function getCandidateFiles(candidateId: string) {
  return api.get(`/candidates/${candidateId}/files`, candidateFilesResponseSchema);
}

export function reserveCandidateFile(
  candidateId: string,
  body: {
    fileId: string;
    kind: 'resume' | 'cover_letter' | 'portfolio' | 'attachment' | 'other';
    visibility: 'standard' | 'private';
    metadata: EncryptedEnvelope;
    declaredMimeType: string;
    expectedEncryptedBytes: number;
    applicationId: string | null;
  },
) {
  return api.post(`/candidates/${candidateId}/files/reservations`, body, candidateFileReservationResponseSchema);
}

export function uploadCandidateFile(candidateId: string, fileId: string, encryptedFile: Blob, uploadToken: string) {
  return api.putBlob(
    `/candidates/${candidateId}/files/${fileId}/content`,
    encryptedFile,
    uploadToken,
    candidateFileUploadResponseSchema,
  );
}

export function finalizeCandidateFile(candidateId: string, fileId: string) {
  return api.post(`/candidates/${candidateId}/files/${fileId}/finalize`, {}, candidateFileFinalizeResponseSchema);
}

export function updateCandidateFile(
  candidateId: string,
  fileId: string,
  body: {
    metadata?: EncryptedEnvelope;
    visibility?: 'standard' | 'private';
    makeCurrentResume?: true;
  },
) {
  return api.patch(`/candidates/${candidateId}/files/${fileId}`, body, candidateProfileUpdateResponseSchema);
}

export function deleteCandidateFile(candidateId: string, fileId: string) {
  return api.delete(`/candidates/${candidateId}/files/${fileId}`, candidateProfileUpdateResponseSchema);
}

export function fetchEncryptedCandidateFile(candidateId: string, fileId: string) {
  return api.getBlob(`/candidates/${candidateId}/files/${fileId}/content`);
}

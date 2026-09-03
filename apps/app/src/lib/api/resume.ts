import { api } from './client';

/** Fetch encrypted resume blob from R2 via API. */
export function fetchEncryptedResume(applicationId: string, interviewEventId?: string): Promise<ArrayBuffer> {
  const params = interviewEventId ? new URLSearchParams({ interviewEventId }) : null;
  const query = params ? `?${params.toString()}` : '';

  return api.getBlob(`/applications/${applicationId}/resume${query}`);
}

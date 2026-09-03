import { api } from './client';

export function fetchEncryptedApplicationFile(
  applicationId: string,
  questionId: string,
  interviewEventId?: string,
): Promise<ArrayBuffer> {
  const query = interviewEventId ? `?${new URLSearchParams({ interviewEventId }).toString()}` : '';

  return api.getBlob(`/applications/${applicationId}/files/${questionId}${query}`);
}

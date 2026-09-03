import {
  duplicateApplicationAttemptsResponseSchema,
  otherApplicationsResponseSchema,
  recipientKeySchema,
} from '@comitium/schemas/applications';
import { emailListResponseSchema } from '@/lib/schemas/emails';

import { api } from './client';
import { buildCursorSearchParams, DEFAULT_CURSOR_PAGE_SIZE } from './cursor-pagination';

export function getEmails(applicationId: string, limit = DEFAULT_CURSOR_PAGE_SIZE, cursor?: string) {
  const params = buildCursorSearchParams(limit, cursor);

  return api.get(`/applications/${applicationId}/emails?${params.toString()}`, emailListResponseSchema);
}

export function getOtherApplications(applicationId: string, limit = DEFAULT_CURSOR_PAGE_SIZE, cursor?: string) {
  const params = buildCursorSearchParams(limit, cursor);

  return api.get(
    `/applications/${applicationId}/other-applications?${params.toString()}`,
    otherApplicationsResponseSchema,
  );
}

export function getDuplicateApplicationAttempts(
  applicationId: string,
  limit = DEFAULT_CURSOR_PAGE_SIZE,
  cursor?: string,
) {
  const params = buildCursorSearchParams(limit, cursor);

  return api.get(
    `/applications/${applicationId}/duplicate-attempts?${params.toString()}`,
    duplicateApplicationAttemptsResponseSchema,
  );
}

export function getRecipientKey(applicationId: string) {
  return api.get(`/applications/${applicationId}/recipient-key`, recipientKeySchema);
}

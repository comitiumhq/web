import { formSubmissionResponseSchema } from '@comitium/schemas/forms/form-submission';

import { api } from './client';

export function getApplicationFormSubmission(applicationId: string) {
  return api.get(`/applications/${applicationId}/form-submission`, formSubmissionResponseSchema);
}

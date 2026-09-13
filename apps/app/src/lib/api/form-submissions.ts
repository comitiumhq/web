import type { FormSubmissionFieldProjection } from '@comitium/schemas/forms/form-submission';
import { formSubmissionResponseSchema } from '@comitium/schemas/forms/form-submission';
import { successSchema } from '@comitium/schemas/public';

import { api } from './client';

export function getApplicationFormSubmission(applicationId: string) {
  return api.get(`/applications/${applicationId}/form-submission`, formSubmissionResponseSchema);
}

export function projectApplicationFormSubmission(applicationId: string, fieldValues: FormSubmissionFieldProjection[]) {
  return api.put(`/applications/${applicationId}/form-submission/field-values`, { fieldValues }, successSchema);
}

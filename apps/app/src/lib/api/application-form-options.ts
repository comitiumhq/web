import { applicationFormOptionsResponseSchema } from '@comitium/schemas/forms/form-definitions';

import { api } from './client';

export type ApplicationFormOptionsOwner = { kind: 'job'; jobId: string } | { kind: 'job_template' };

export function getApplicationFormOptions(orgId: string, owner: ApplicationFormOptionsOwner) {
  const path =
    owner.kind === 'job'
      ? `/jobs/${owner.jobId}/application-form-options`
      : `/orgs/${orgId}/job-templates/application-form-options`;

  return api.get(path, applicationFormOptionsResponseSchema);
}

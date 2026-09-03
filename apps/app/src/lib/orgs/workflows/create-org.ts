import { ContractError } from '@comitium/schemas/product-errors';
import { errAsync, okAsync, ResultAsync } from 'neverthrow';
import { prepareOrgCreation } from '@/lib/api/orgs-creation';

import { sendCreateOrgBundle } from '../core/contract';
import type { CreateOrgWorkflowResult, OrgError } from '../types';

export function createOrgWorkflow(): ResultAsync<CreateOrgWorkflowResult, OrgError> {
  return ResultAsync.fromPromise(
    prepareOrgCreation(),
    (error) => new ContractError('prepare_organization_creation', error),
  ).andThen((preparation) => {
    if (preparation.state === 'try_again') {
      return errAsync(
        new ContractError('prepare_organization_creation', new Error('Organization creation must be prepared again')),
      );
    }

    if (preparation.state !== 'wallet_confirmation') {
      return okAsync({ kind: 'confirming' as const });
    }

    return sendCreateOrgBundle(preparation).map(() => ({ kind: 'confirming' as const }));
  });
}

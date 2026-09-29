import { applicationSubmitDispositionSchema } from '@comitium/schemas/applications';
import { getOnchainOperationProductState } from '@comitium/schemas/onchain-operations';
import { describe, expect, it } from 'vitest';
import { createOrgResponseSchema } from '../org';

const OPERATION_ID = '11111111-2222-4333-8444-555555555555';

describe('direct wallet product state boundary', () => {
  it('maps internal reconciliation to confirming inside private direct-wallet adapters', () => {
    const application = applicationSubmitDispositionSchema.parse({
      state: getOnchainOperationProductState('repair_required', 'internal_only'),
      operationId: OPERATION_ID,
    });

    expect(application.state).toBe('confirming');
    expect(
      [application].map((value) => ({
        hasStage: 'stage' in value,
        hasTxHash: 'txHash' in value,
      })),
    ).toEqual([{ hasStage: false, hasTxHash: false }]);
  });

  it('keeps registry synchronization states out of the organization creation contract', () => {
    expect(
      createOrgResponseSchema.parse({
        state: 'completed',
        organizationId: OPERATION_ID,
      }),
    ).toEqual({ state: 'completed', organizationId: OPERATION_ID });
    expect(() =>
      createOrgResponseSchema.parse({
        state: 'repair_required',
        operationId: OPERATION_ID,
      }),
    ).toThrow();
  });
});

import type { JobApplicationData } from '@comitium/schemas/jobs';
import { ValidationError } from '@comitium/schemas/product-errors';
import { ResultAsync } from 'neverthrow';
import { type Address, isAddressEqual } from 'viem';

export function validateApplicationData(
  jobData: JobApplicationData,
  applicantAddress: Address,
  stakeAmount: bigint,
): ResultAsync<void, ValidationError> {
  return ResultAsync.fromPromise(
    (async () => {
      if (isAddressEqual(jobData.creatorAddress, applicantAddress)) {
        throw new ValidationError('applicant', 'Cannot apply to your own job');
      }

      if (stakeAmount <= 0n) {
        throw new ValidationError('applicantStake', 'Invalid deposit amount');
      }
    })(),
    (e) => (e instanceof ValidationError ? e : new ValidationError('unknown', String(e))),
  );
}

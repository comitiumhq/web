import { resolveJobCommitment } from '@comitium/chain/deployment-catalog';
import { jobFundsContract, publicClient } from '@comitium/chain/instances';
import {
  onchainSafeIntegerSchema,
  onchainUintSchema,
  parseOnchainAddress,
  parseOnchainSafeInteger,
  parseOnchainUint,
  tupleField,
} from '@comitium/schemas/onchain';
import { ContractError } from '@comitium/schemas/product-errors';
import { ResultAsync } from 'neverthrow';
import type { Address } from 'viem';
import { z } from 'zod';

import { type JobEconomicsConfig, normalizeJobEconomicsConfig } from './job-economics';

const jobConfigSchema = z.object({
  minStake: onchainUintSchema,
  tierCount: onchainSafeIntegerSchema,
  maxBatchSize: onchainSafeIntegerSchema,
  maxUnpublishedDuration: onchainSafeIntegerSchema,
  maxPublishedDuration: onchainSafeIntegerSchema,
});

const feeTierSchema = z.object({
  baseFee: onchainUintSchema,
  feeBps: onchainUintSchema,
  deadlineDays: onchainSafeIntegerSchema,
});

export function readCurrentJobConfig(): ResultAsync<JobEconomicsConfig, ContractError> {
  return ResultAsync.fromPromise(readCurrentJobConfigUnchecked(), (e) => new ContractError('read_job_config', e));
}

export async function fetchCurrentJobConfig(): Promise<JobEconomicsConfig> {
  const result = await readCurrentJobConfig();

  if (result.isErr()) {
    throw result.error;
  }

  return result.value;
}

export async function fetchJobCommitmentMaxBatchSize(commitmentContract: Address): Promise<number> {
  const { bindings } = resolveJobCommitment(commitmentContract);
  const version = parseOnchainSafeInteger(
    await bindings.readCurrentConfigVersion(publicClient, commitmentContract),
    'currentConfigVersion',
  );
  const configTuple = await bindings.readJobConfig(publicClient, commitmentContract, version);

  return parseJobConfigTuple(configTuple).maxBatchSize;
}

export async function fetchApplicantStakeAmount(commitmentContract: Address): Promise<bigint> {
  const { bindings } = resolveJobCommitment(commitmentContract);
  const amount = await bindings.readApplicantStakeAmount(publicClient, commitmentContract);

  return parseOnchainUint(amount, 'applicantStakeAmount');
}

async function readCurrentJobConfigUnchecked(): Promise<JobEconomicsConfig> {
  const currentJobCommitment = parseOnchainAddress(
    await publicClient.readContract({
      ...jobFundsContract,
      functionName: 'currentJobCommitment',
    }),
    'currentJobCommitment',
  );
  const { bindings } = resolveJobCommitment(currentJobCommitment);

  const version = parseOnchainSafeInteger(
    await bindings.readCurrentConfigVersion(publicClient, currentJobCommitment),
    'currentConfigVersion',
  );

  const [configTuple, feeTierTuples] = await Promise.all([
    bindings.readJobConfig(publicClient, currentJobCommitment, version),
    bindings.readFeeTiers(publicClient, currentJobCommitment, version),
  ]);
  const config = parseJobConfigTuple(configTuple);
  const feeTiers = parseFeeTierTuples(feeTierTuples, config.tierCount);

  return normalizeJobEconomicsConfig({
    version,
    ...config,
    feeTiers,
  });
}

function parseJobConfigTuple(tuple: unknown) {
  return jobConfigSchema.parse({
    minStake: tupleField(tuple, 0, 'minStake'),
    tierCount: tupleField(tuple, 1, 'tierCount'),
    maxBatchSize: tupleField(tuple, 2, 'maxBatchSize'),
    maxUnpublishedDuration: tupleField(tuple, 3, 'maxUnpublishedDuration'),
    maxPublishedDuration: tupleField(tuple, 4, 'maxPublishedDuration'),
  });
}

function parseFeeTierTuples(value: unknown, tierCount: number) {
  if (!Array.isArray(value)) {
    throw new Error('Invalid feeTiers: expected array');
  }

  if (value.length < tierCount) {
    throw new Error(`Invalid feeTiers: expected at least ${tierCount} entries`);
  }

  return value.slice(0, tierCount).map((tier, index) => ({
    index,
    ...feeTierSchema.parse({
      baseFee: tupleField(tier, 0, 'baseFee'),
      feeBps: tupleField(tier, 1, 'feeBps'),
      deadlineDays: tupleField(tier, 2, 'deadlineDays'),
    }),
  }));
}

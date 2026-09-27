import { resolveResponseCommitment } from '@comitium/chain/deployment-catalog';
import { commitmentFundsContract, publicClient } from '@comitium/chain/instances';
import {
  onchainSafeIntegerSchema,
  onchainUintSchema,
  parseOnchainAddress,
  parseOnchainSafeInteger,
  tupleField,
} from '@comitium/schemas/onchain';
import { ContractError } from '@comitium/schemas/product-errors';
import { ResultAsync } from 'neverthrow';
import type { Address } from 'viem';
import { z } from 'zod';

import {
  normalizeResponseCommitmentEconomicsConfig,
  type ResponseCommitmentEconomicsConfig,
} from './response-commitment-economics';

const commitmentConfigSchema = z.object({
  minStake: onchainUintSchema,
  tierCount: onchainSafeIntegerSchema,
  maxBatchSize: onchainSafeIntegerSchema,
  maxStoppedDuration: onchainSafeIntegerSchema,
  maxActiveDuration: onchainSafeIntegerSchema,
});

const feeTierSchema = z.object({
  baseFee: onchainUintSchema,
  feeBps: onchainUintSchema,
  deadlineDays: onchainSafeIntegerSchema,
});

export function readCurrentResponseCommitmentConfig(): ResultAsync<ResponseCommitmentEconomicsConfig, ContractError> {
  return ResultAsync.fromPromise(
    readCurrentResponseCommitmentConfigUnchecked(),
    (error) => new ContractError('read_response_commitment_config', error),
  );
}

export async function fetchCurrentResponseCommitmentConfig(): Promise<ResponseCommitmentEconomicsConfig> {
  const result = await readCurrentResponseCommitmentConfig();

  if (result.isErr()) {
    throw result.error;
  }

  return result.value;
}

export async function fetchResponseCommitmentMaxBatchSize(responseCommitmentContract: Address): Promise<number> {
  const { bindings } = resolveResponseCommitment(responseCommitmentContract);
  const version = parseOnchainSafeInteger(
    await bindings.readCurrentConfigVersion(publicClient, responseCommitmentContract),
    'currentConfigVersion',
  );
  const configTuple = await bindings.readCommitmentConfig(publicClient, responseCommitmentContract, version);

  return parseCommitmentConfigTuple(configTuple).maxBatchSize;
}

async function readCurrentResponseCommitmentConfigUnchecked(): Promise<ResponseCommitmentEconomicsConfig> {
  const currentResponseCommitment = parseOnchainAddress(
    await publicClient.readContract({
      ...commitmentFundsContract,
      functionName: 'currentResponseCommitment',
    }),
    'currentResponseCommitment',
  );
  const { bindings } = resolveResponseCommitment(currentResponseCommitment);

  const version = parseOnchainSafeInteger(
    await bindings.readCurrentConfigVersion(publicClient, currentResponseCommitment),
    'currentConfigVersion',
  );

  const [configTuple, feeTierTuples] = await Promise.all([
    bindings.readCommitmentConfig(publicClient, currentResponseCommitment, version),
    bindings.readFeeTiers(publicClient, currentResponseCommitment, version),
  ]);
  const config = parseCommitmentConfigTuple(configTuple);
  const feeTiers = parseFeeTierTuples(feeTierTuples, config.tierCount);

  return normalizeResponseCommitmentEconomicsConfig({
    version,
    ...config,
    feeTiers,
  });
}

function parseCommitmentConfigTuple(tuple: unknown) {
  return commitmentConfigSchema.parse({
    minStake: tupleField(tuple, 0, 'minStake'),
    tierCount: tupleField(tuple, 1, 'tierCount'),
    maxBatchSize: tupleField(tuple, 2, 'maxBatchSize'),
    maxStoppedDuration: tupleField(tuple, 3, 'maxStoppedDuration'),
    maxActiveDuration: tupleField(tuple, 4, 'maxActiveDuration'),
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

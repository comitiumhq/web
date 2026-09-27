import { type Address, getAddress, type Hex } from 'viem';
import { z } from 'zod';

import rawDeploymentCatalog from '../deployment-catalog.json';
import { activeChain } from './chains';
import { responseCommitmentBindings } from './response-commitment/bindings';

const EVM_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;
const BYTES32_HEX_REGEX = /^0x[a-fA-F0-9]{64}$/;
const bytes32HexSchema = z.custom<Hex>(
  (value) => typeof value === 'string' && BYTES32_HEX_REGEX.test(value),
  'Expected bytes32 hex string',
);

const addressSchema = z
  .string()
  .regex(EVM_ADDRESS_REGEX, 'Invalid contract address')
  .transform((value) => getAddress(value));

const positiveIntegerSchema = z.number().int().positive();

const chainIdSchema = z.string().refine((value) => {
  const chainId = Number(value);

  return Number.isSafeInteger(chainId) && chainId > 0 && String(chainId) === value;
}, 'Invalid chain ID');

const deploymentSchema = z
  .object({
    deploymentSetVersion: positiveIntegerSchema,
    contracts: z.object({
      forwarder: addressSchema,
      orgRegistry: z.object({ address: addressSchema }),
      commitmentFunds: z.object({ address: addressSchema }),
      responseCommitments: z
        .array(
          z.object({
            commitmentVersion: positiveIntegerSchema,
            address: addressSchema,
            startBlock: positiveIntegerSchema,
            domainSeparator: bytes32HexSchema,
            runtimeCodeHash: bytes32HexSchema,
          }),
        )
        .min(1),
    }),
  })
  .superRefine((deployment, context) => {
    const seen = new Set<string>();

    for (const commitment of deployment.contracts.responseCommitments) {
      const address = commitment.address.toLowerCase();

      if (seen.has(address)) {
        context.addIssue({
          code: 'custom',
          message: `Duplicate ResponseCommitment address: ${commitment.address}`,
          path: ['contracts', 'responseCommitments'],
        });
      }

      seen.add(address);
    }
  });

const deploymentCatalogSchema = z.object({
  schemaVersion: z.literal(1),
  deployments: z.record(chainIdSchema, deploymentSchema),
});

export const deploymentCatalog = deploymentCatalogSchema.parse(rawDeploymentCatalog);

export function deploymentForChain(chainId: number | string) {
  const normalizedChainId = Number(chainId);
  const deployment = deploymentCatalog.deployments[String(normalizedChainId)];

  if (!deployment) {
    throw new Error(`No deployment catalog for chain ${normalizedChainId}`);
  }

  return deployment;
}

export function resolveResponseCommitment(address: Address | string) {
  const deployment = deploymentForChain(activeChain.id);
  const normalizedAddress = getAddress(address);
  const entry = deployment.contracts.responseCommitments.find(
    (commitment) => commitment.address.toLowerCase() === normalizedAddress.toLowerCase(),
  );

  if (!entry) {
    throw new Error(`Unknown ResponseCommitment address on chain ${activeChain.id}: ${normalizedAddress}`);
  }

  if (entry.commitmentVersion !== responseCommitmentBindings.commitmentVersion) {
    throw new Error(`Unsupported ResponseCommitment version: ${entry.commitmentVersion}`);
  }

  return { ...entry, bindings: responseCommitmentBindings };
}

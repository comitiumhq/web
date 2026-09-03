import { randomBytes } from '@noble/hashes/utils.js';
import { parse as parseUuid } from 'uuid';
import {
  type Address,
  bytesToHex,
  encodeAbiParameters,
  getAddress,
  type Hex,
  keccak256,
  stringToHex,
  zeroHash,
} from 'viem';

const COMMITMENT_SALT_SIZE_BYTES = 32;

const APPLICATION_ID_TYPE =
  'ApplicationId(uint256 chainId,address commitmentContract,uint256 jobId,bytes16 jobUuid,bytes16 applicationUuid,bytes32 salt)' as const;
const APPLICATION_ID_TYPEHASH = keccak256(stringToHex(APPLICATION_ID_TYPE));

export type ApplicationIdOpening = {
  chainId: bigint | number;
  commitmentContract: Address | string;
  jobId: bigint | number;
  jobUuid: string;
  applicationUuid: string;
  salt: Hex;
};

export function deriveApplicationId(opening: ApplicationIdOpening): Hex {
  if (opening.salt.toLowerCase() === zeroHash) {
    throw new Error('Commitment salt must be non-zero');
  }

  return keccak256(
    encodeAbiParameters(
      [
        { type: 'bytes32' },
        { type: 'uint256' },
        { type: 'address' },
        { type: 'uint256' },
        { type: 'bytes16' },
        { type: 'bytes16' },
        { type: 'bytes32' },
      ],
      [
        APPLICATION_ID_TYPEHASH,
        BigInt(opening.chainId),
        getAddress(opening.commitmentContract as Address),
        BigInt(opening.jobId),
        uuidToBytes16(opening.jobUuid),
        uuidToBytes16(opening.applicationUuid),
        opening.salt,
      ],
    ),
  );
}

export function generateApplicationSalt(): Hex {
  let salt: Hex = zeroHash;

  while (salt === zeroHash) {
    salt = bytesToHex(randomBytes(COMMITMENT_SALT_SIZE_BYTES));
  }

  return salt;
}

function uuidToBytes16(uuid: string): Hex {
  return bytesToHex(parseUuid(uuid));
}

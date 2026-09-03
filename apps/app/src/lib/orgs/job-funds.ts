import { sendProductTransaction } from '@comitium/auth/send-calls';
import type { CanonicalWallet } from '@comitium/auth/wallet';
import { ACTIVE_CHAIN_ID } from '@comitium/chain/chains';
import { jobFundsAbi } from '@comitium/chain/generated/contracts';
import { jobFundsContract } from '@comitium/chain/instances';
import { TransactionError } from '@comitium/schemas/product-errors';
import { randomBytes } from '@noble/hashes/utils.js';
import { addHours, getUnixTime } from 'date-fns';
import { ResultAsync } from 'neverthrow';
import { type Address, bytesToHex, encodeFunctionData, type Hex, parseSignature } from 'viem';

const ECDSA_V_BY_Y_PARITY = [27, 28] as const;
const EIP3009_NONCE_SIZE_BYTES = 32;
const USDC_AUTHORIZATION_TTL_HOURS = 1;

const USDC_AUTHORIZATION_DOMAIN = {
  name: 'USD Coin',
  version: '2',
} as const;

const USDC_RECEIVE_WITH_AUTHORIZATION_TYPES = {
  ReceiveWithAuthorization: [
    { name: 'from', type: 'address' },
    { name: 'to', type: 'address' },
    { name: 'value', type: 'uint256' },
    { name: 'validAfter', type: 'uint256' },
    { name: 'validBefore', type: 'uint256' },
    { name: 'nonce', type: 'bytes32' },
  ],
};

interface JobFundsTransactionParams {
  wallet: CanonicalWallet;
  onChainOrgId: number;
  amount: bigint;
}

interface DepositJobFundsParams extends JobFundsTransactionParams {
  stakeToken: Address;
}

interface SignedUsdcAuthorization {
  validAfter: bigint;
  validBefore: bigint;
  nonce: Hex;
  v: 27 | 28;
  r: Hex;
  s: Hex;
}

export function depositJobFunds(params: DepositJobFundsParams): ResultAsync<Hex, TransactionError> {
  return ResultAsync.fromPromise(
    signAndDepositJobFunds(params),
    (error) => new TransactionError('job_funds_deposit', error),
  );
}

async function signUsdcReceiveAuthorization(params: DepositJobFundsParams): Promise<SignedUsdcAuthorization> {
  const validAfter = 0n;
  const validBefore = BigInt(getUnixTime(addHours(new Date(), USDC_AUTHORIZATION_TTL_HOURS)));
  const nonce = bytesToHex(randomBytes(EIP3009_NONCE_SIZE_BYTES));

  const { r, s, yParity } = parseSignature(
    await params.wallet.signTypedData({
      domain: {
        ...USDC_AUTHORIZATION_DOMAIN,
        chainId: ACTIVE_CHAIN_ID,
        verifyingContract: params.stakeToken,
      },
      types: USDC_RECEIVE_WITH_AUTHORIZATION_TYPES,
      primaryType: 'ReceiveWithAuthorization',
      message: {
        from: params.wallet.address,
        to: jobFundsContract.address,
        value: params.amount.toString(),
        validAfter: validAfter.toString(),
        validBefore: validBefore.toString(),
        nonce,
      },
    }),
  );

  return {
    validAfter,
    validBefore,
    nonce,
    v: ECDSA_V_BY_Y_PARITY[yParity],
    r,
    s,
  };
}

async function signAndDepositJobFunds(params: DepositJobFundsParams): Promise<Hex> {
  const authorization = await signUsdcReceiveAuthorization(params);

  return sendProductTransaction(params.wallet, {
    chainId: ACTIVE_CHAIN_ID,
    to: jobFundsContract.address,
    data: encodeFunctionData({
      abi: jobFundsAbi,
      functionName: 'depositWithAuthorization',
      args: [
        BigInt(params.onChainOrgId),
        params.amount,
        authorization.validAfter,
        authorization.validBefore,
        authorization.nonce,
        authorization.v,
        authorization.r,
        authorization.s,
      ],
    }),
    value: 0n,
  });
}

export function withdrawJobFunds(params: JobFundsTransactionParams): ResultAsync<Hex, TransactionError> {
  return ResultAsync.fromPromise(
    sendProductTransaction(params.wallet, {
      chainId: ACTIVE_CHAIN_ID,
      to: jobFundsContract.address,
      data: encodeFunctionData({
        abi: jobFundsAbi,
        functionName: 'withdraw',
        args: [BigInt(params.onChainOrgId), params.amount],
      }),
      value: 0n,
    }),
    (error) => new TransactionError('job_funds_withdraw', error),
  );
}

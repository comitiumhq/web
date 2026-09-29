import type { CanonicalWallet } from '@comitium/auth/wallet';
import { ACTIVE_CHAIN_ID } from '@comitium/chain/chains';
import { commitmentFundsAbi } from '@comitium/chain/generated/contracts';
import { type Address, encodeFunctionData, type Hex, parseSignature } from 'viem';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  signTypedData: vi.fn(),
  sendProductTransaction: vi.fn(),
}));

vi.mock('@comitium/auth/send-calls', () => ({
  sendProductTransaction: mocks.sendProductTransaction,
}));

const COMMITMENT_FUNDS_CONTRACT = { address: '0x2222222222222222222222222222222222222222' };
const STAKE_TOKEN = '0x3333333333333333333333333333333333333333' as Address;
const EXPECTED_ECDSA_V = 27;

vi.mock('@comitium/chain/instances', () => ({
  commitmentFundsContract: COMMITMENT_FUNDS_CONTRACT,
}));

const { depositCommitmentFunds, withdrawCommitmentFunds } = await import('../commitment-funds');

const TX_HASH = `0x${'a'.repeat(64)}` as Hex;
const SIGNATURE = `0x${'1'.repeat(64)}${'2'.repeat(64)}1b` as Hex;
const WALLET = {
  id: 'wallet-id',
  address: '0x1111111111111111111111111111111111111111',
  signTypedData: mocks.signTypedData,
  sendTransaction: vi.fn(),
  switchChain: vi.fn(),
} as CanonicalWallet;

describe('commitment funds transactions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.signTypedData.mockResolvedValue(SIGNATURE);
    mocks.sendProductTransaction.mockResolvedValue(TX_HASH);
  });

  it('signs an EIP-3009 authorization and deposits in one direct wallet transaction', async () => {
    const result = await depositCommitmentFunds({
      wallet: WALLET,
      stakeToken: STAKE_TOKEN,
      onChainOrgId: 12,
      amount: 123000000n,
    });

    expect(result._unsafeUnwrap()).toBe(TX_HASH);
    expect(mocks.signTypedData).toHaveBeenCalledOnce();

    const typedData = mocks.signTypedData.mock.calls[0]?.[0];
    expect(typedData).toMatchObject({
      domain: {
        name: 'USD Coin',
        version: '2',
        chainId: ACTIVE_CHAIN_ID,
        verifyingContract: STAKE_TOKEN,
      },
      primaryType: 'ReceiveWithAuthorization',
      message: {
        from: WALLET.address,
        to: COMMITMENT_FUNDS_CONTRACT.address,
        value: '123000000',
        validAfter: '0',
      },
    });
    expect(typedData.message.nonce).toMatch(/^0x[0-9a-f]{64}$/);

    const parsedSignature = parseSignature(SIGNATURE);
    expect(mocks.sendProductTransaction).toHaveBeenCalledExactlyOnceWith(WALLET, {
      chainId: ACTIVE_CHAIN_ID,
      to: COMMITMENT_FUNDS_CONTRACT.address,
      data: encodeFunctionData({
        abi: commitmentFundsAbi,
        functionName: 'depositWithAuthorization',
        args: [
          12n,
          123000000n,
          0n,
          BigInt(typedData.message.validBefore),
          typedData.message.nonce,
          EXPECTED_ECDSA_V,
          parsedSignature.r,
          parsedSignature.s,
        ],
      }),
      value: 0n,
    });
  });

  it('keeps withdrawal as one direct wallet transaction', async () => {
    const result = await withdrawCommitmentFunds({
      wallet: WALLET,
      onChainOrgId: 12,
      amount: 123000000n,
    });

    expect(result._unsafeUnwrap()).toBe(TX_HASH);
    expect(mocks.sendProductTransaction).toHaveBeenCalledExactlyOnceWith(WALLET, {
      chainId: ACTIVE_CHAIN_ID,
      to: COMMITMENT_FUNDS_CONTRACT.address,
      data: encodeFunctionData({
        abi: commitmentFundsAbi,
        functionName: 'withdraw',
        args: [12n, 123000000n],
      }),
      value: 0n,
    });
  });
});

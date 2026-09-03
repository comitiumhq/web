import type { WalletAccount } from '@comitium/auth/send-calls';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ContractAuthorityMutationResult, ContractAuthorityRequest } from '@/lib/schemas/contract-authority';

import { executeContractAuthorityMutation } from '../use-contract-authority-mutation';

const BUNDLE_HASH = `0x${'a'.repeat(64)}` as const;
const SIGNATURE = `0x${'b'.repeat(130)}` as const;

function authorityRequest(nonce: number): ContractAuthorityRequest {
  return {
    domain: {
      name: 'ComitiumForwarder',
      version: '1',
      chainId: 84532,
      verifyingContract: '0x1111111111111111111111111111111111111111',
    },
    types: {
      ForwardRequest: [
        { name: 'from', type: 'address' },
        { name: 'to', type: 'address' },
        { name: 'value', type: 'uint256' },
        { name: 'gas', type: 'uint256' },
        { name: 'nonce', type: 'uint256' },
        { name: 'deadline', type: 'uint48' },
        { name: 'data', type: 'bytes' },
      ],
    },
    primaryType: 'ForwardRequest',
    message: {
      from: '0x2222222222222222222222222222222222222222',
      to: '0x3333333333333333333333333333333333333333',
      value: '0',
      gas: '250000',
      nonce: String(nonce),
      deadline: '2000000000',
      data: '0x1234',
    },
  };
}

function signatureRequired(requests: ContractAuthorityRequest[]): ContractAuthorityMutationResult {
  return {
    state: 'signature_required',
    authority: {
      bundleHash: BUNDLE_HASH,
      requests,
    },
  };
}

function walletAccount(signTypedData: WalletAccount['signTypedData']): WalletAccount {
  return {
    address: '0x2222222222222222222222222222222222222222',
    signTypedData,
  } as WalletAccount;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('executeContractAuthorityMutation', () => {
  it('applies a mutation without requiring a wallet when no contract authority changes', async () => {
    const mutate = vi.fn<Parameters<typeof executeContractAuthorityMutation>[0]>().mockResolvedValue({
      state: 'applied',
    });

    await expect(executeContractAuthorityMutation(mutate, null)).resolves.toBeUndefined();

    expect(mutate).toHaveBeenCalledExactlyOnceWith(null);
  });

  it('reuses an already accepted aggregate without asking for another signature', async () => {
    const mutate = vi.fn<Parameters<typeof executeContractAuthorityMutation>[0]>().mockResolvedValue({
      state: 'accepted',
    });

    await expect(executeContractAuthorityMutation(mutate, null)).resolves.toBeUndefined();

    expect(mutate).toHaveBeenCalledExactlyOnceWith(null);
  });

  it('does not mutate server state when the wallet rejects request N', async () => {
    const first = authorityRequest(1);
    const second = authorityRequest(2);
    const third = authorityRequest(3);
    const mutate = vi
      .fn<Parameters<typeof executeContractAuthorityMutation>[0]>()
      .mockResolvedValue(signatureRequired([first, second, third]));
    const signTypedData = vi
      .fn()
      .mockResolvedValueOnce(SIGNATURE)
      .mockRejectedValueOnce(new Error('User rejected request'));

    await expect(executeContractAuthorityMutation(mutate, walletAccount(signTypedData))).rejects.toThrow(
      "We couldn't save these access changes. Refresh the page before trying again.",
    );

    expect(mutate).toHaveBeenCalledExactlyOnceWith(null);
    expect(signTypedData).toHaveBeenCalledTimes(2);
  });

  it('submits one aggregate proof only after every request is signed', async () => {
    const first = authorityRequest(1);
    const second = authorityRequest(2);
    const accepted: ContractAuthorityMutationResult = {
      state: 'accepted',
    };
    const mutate = vi
      .fn<Parameters<typeof executeContractAuthorityMutation>[0]>()
      .mockResolvedValueOnce(signatureRequired([first, second]))
      .mockResolvedValueOnce(accepted);
    const signTypedData = vi.fn().mockResolvedValue(SIGNATURE);

    await executeContractAuthorityMutation(mutate, walletAccount(signTypedData));

    expect(signTypedData).toHaveBeenCalledTimes(2);
    expect(mutate).toHaveBeenNthCalledWith(1, null);
    expect(mutate).toHaveBeenNthCalledWith(2, {
      bundleHash: BUNDLE_HASH,
      requests: [
        { message: first.message, signature: SIGNATURE },
        { message: second.message, signature: SIGNATURE },
      ],
    });
  });

  it('accepts an idempotent applied response after all requests were signed', async () => {
    const request = authorityRequest(1);
    const mutate = vi
      .fn<Parameters<typeof executeContractAuthorityMutation>[0]>()
      .mockResolvedValueOnce(signatureRequired([request]))
      .mockResolvedValueOnce({ state: 'applied' });
    const signTypedData = vi.fn().mockResolvedValue(SIGNATURE);

    await expect(executeContractAuthorityMutation(mutate, walletAccount(signTypedData))).resolves.toBeUndefined();

    expect(mutate).toHaveBeenCalledTimes(2);
  });

  it('does not treat a second preparation response as accepted', async () => {
    const request = authorityRequest(1);
    const mutate = vi
      .fn<Parameters<typeof executeContractAuthorityMutation>[0]>()
      .mockResolvedValue(signatureRequired([request]));
    const signTypedData = vi.fn().mockResolvedValue(SIGNATURE);

    await expect(executeContractAuthorityMutation(mutate, walletAccount(signTypedData))).rejects.toThrow(
      "We couldn't save these access changes. Refresh the page before trying again.",
    );

    expect(mutate).toHaveBeenCalledTimes(2);
  });

  it('does not expose preparation errors from the access control service', async () => {
    const mutate = vi
      .fn<Parameters<typeof executeContractAuthorityMutation>[0]>()
      .mockRejectedValue(new Error('Another contract authority update is already in progress'));

    await expect(executeContractAuthorityMutation(mutate, null)).rejects.toThrow(
      "We couldn't save these access changes. Refresh the page before trying again.",
    );
  });
});

import type { WalletAccount } from '@comitium/auth/send-calls';

import { useAccount } from '@comitium/auth/use-wallet';
import { useCallback } from 'react';
import { signOnchainOperationRequest } from '@/lib/onchain-operation-signatures';
import type {
  ContractAuthorityMutationResult,
  ContractAuthorityProof,
  ContractAuthorityRequest,
} from '@/lib/schemas/contract-authority';

const ACCESS_MUTATION_ERROR = "We couldn't save these access changes. Refresh the page before trying again.";

export type ContractAuthorityMutation = (
  authorityProof: ContractAuthorityProof | null,
) => Promise<ContractAuthorityMutationResult>;

async function signContractAuthorityRequests(
  account: WalletAccount,
  requests: ContractAuthorityRequest[],
): Promise<ContractAuthorityProof['requests']> {
  return requests.reduce<Promise<ContractAuthorityProof['requests']>>(async (signedRequests, request) => {
    const signed = await signedRequests;
    const signature = await signOnchainOperationRequest(account, request);

    return [...signed, { message: request.message, signature }];
  }, Promise.resolve([]));
}

async function performContractAuthorityMutation(
  mutate: ContractAuthorityMutation,
  account: WalletAccount | null,
): Promise<void> {
  const prepared = await mutate(null);

  if (prepared.state === 'applied' || prepared.state === 'accepted') {
    return;
  }

  if (prepared.state !== 'signature_required') {
    throw new Error('Unexpected access mutation response');
  }

  if (!account) {
    throw new Error('Wallet is not connected');
  }

  const requests = await signContractAuthorityRequests(account, prepared.authority.requests);
  const authorityProof = {
    bundleHash: prepared.authority.bundleHash,
    requests,
  } satisfies ContractAuthorityProof;
  const accepted = await mutate(authorityProof);

  if (accepted.state === 'applied' || accepted.state === 'accepted') {
    return;
  }

  throw new Error('Access mutation was not accepted');
}

export async function executeContractAuthorityMutation(
  mutate: ContractAuthorityMutation,
  account: WalletAccount | null,
): Promise<void> {
  try {
    await performContractAuthorityMutation(mutate, account);
  } catch (error) {
    throw new Error(ACCESS_MUTATION_ERROR, { cause: error });
  }
}

export function useContractAuthorityMutation() {
  const { account } = useAccount();

  return useCallback(
    async (mutate: ContractAuthorityMutation): Promise<void> => {
      await executeContractAuthorityMutation(mutate, account ?? null);
    },
    [account],
  );
}

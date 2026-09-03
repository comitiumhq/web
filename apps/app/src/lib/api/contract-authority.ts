import type { ContractAuthorityProof } from '@/lib/schemas/contract-authority';

export type ContractAuthorityProofInput = ContractAuthorityProof | null;

export function withContractAuthorityProof<T extends object>(
  body: T,
  authorityProof: ContractAuthorityProofInput,
): T | (T & { authorityProof: ContractAuthorityProof }) {
  if (!authorityProof) {
    return body;
  }

  return { ...body, authorityProof };
}

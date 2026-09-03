import { useCryptoUnlock } from '@comitium/auth/use-crypto-unlock';
import { CryptoProxy } from '@comitium/crypto';
import { candidateIdentityInputContext } from '@comitium/crypto/context';
import type { WrappedKey } from '@comitium/schemas/common';
import type { CandidateIdentityInput } from '@comitium/schemas/forms/form-submission';
import { requireNonEmptyText } from '@comitium/schemas/forms/text-value';
import { skipToken, useQuery } from '@tanstack/react-query';
import { qk } from '@/hooks/query-keys';
import type { CandidateIdentityAnswers } from '@/lib/forms/application-answers';

export async function decryptCandidateIdentityInputs(params: {
  candidateIdentityInputs: CandidateIdentityInput[];
  orgId: string;
  wrappedVaultKey: WrappedKey;
}): Promise<CandidateIdentityAnswers> {
  const entries = await Promise.all(
    params.candidateIdentityInputs.map(async (identity) => {
      const decrypted = await CryptoProxy.decryptApplication(
        identity.envelope,
        params.orgId,
        params.wrappedVaultKey,
        candidateIdentityInputContext(params.orgId, identity.applicationId, identity.questionId),
      );

      return [
        identity.questionId,
        requireNonEmptyText(decrypted.value, 'Candidate identity input must contain a non-empty text value'),
      ] as const;
    }),
  );

  return Object.fromEntries(entries);
}

export function useCandidateIdentityInputs(params: {
  candidateIdentityInputs: CandidateIdentityInput[];
  orgId: string;
  wrappedVaultKey: WrappedKey | undefined;
  enabled: boolean;
}) {
  const { ensureUnlocked } = useCryptoUnlock();
  const applicationId = params.candidateIdentityInputs[0]?.applicationId ?? null;
  const questionIds = params.candidateIdentityInputs.map((identity) => identity.questionId).sort();
  const wrappedVaultKey = params.wrappedVaultKey;

  return useQuery({
    queryKey: qk.application.candidateIdentityInputs(applicationId, questionIds),
    enabled: params.enabled && params.candidateIdentityInputs.length > 0,
    queryFn: wrappedVaultKey
      ? async () => {
          await ensureUnlocked();

          return decryptCandidateIdentityInputs({
            candidateIdentityInputs: params.candidateIdentityInputs,
            orgId: params.orgId,
            wrappedVaultKey,
          });
        }
      : skipToken,
    staleTime: Number.POSITIVE_INFINITY,
  });
}

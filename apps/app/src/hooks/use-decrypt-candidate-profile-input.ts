import { useCryptoUnlock } from '@comitium/auth/use-crypto-unlock';
import { CryptoProxy } from '@comitium/crypto';
import { candidateProfileInputContext } from '@comitium/crypto/context';
import type { EncryptedEnvelope, WrappedKey } from '@comitium/schemas/common';
import { candidateProfileInputValueSchema } from '@comitium/schemas/forms/application-required-fields';
import { skipToken, useQuery } from '@tanstack/react-query';
import { qk } from '@/hooks/query-keys';

export function useDecryptCandidateProfileInput(params: {
  applicationId: string | null;
  enabled: boolean;
  envelope: EncryptedEnvelope | null;
  orgId: string;
  wrappedVaultKey: WrappedKey | undefined;
}) {
  const { ensureUnlocked } = useCryptoUnlock();
  const applicationId = params.applicationId;
  const envelope = params.envelope;
  const wrappedVaultKey = params.wrappedVaultKey;

  return useQuery({
    queryKey: qk.application.candidateProfileInput(applicationId),
    enabled: params.enabled && envelope !== null,
    queryFn:
      applicationId && envelope && wrappedVaultKey
        ? async () => {
            await ensureUnlocked();

            const decrypted = await CryptoProxy.decryptApplication(
              envelope,
              params.orgId,
              wrappedVaultKey,
              candidateProfileInputContext(params.orgId, applicationId),
            );

            return candidateProfileInputValueSchema.parse(decrypted);
          }
        : skipToken,
    staleTime: Number.POSITIVE_INFINITY,
  });
}

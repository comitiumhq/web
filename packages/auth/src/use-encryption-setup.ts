import { normalizeAddress } from '@comitium/chain/address';
import { CryptoProxy } from '@comitium/crypto';
import { hasEncryptionKeyBundle } from '@comitium/crypto/key-bundle';
import type { PublicEncryptionKey } from '@comitium/crypto/schemas';
import type { User, UserKeyShare } from '@comitium/schemas/auth';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useAccount, useSignMessage } from './use-wallet';

interface InitializeEncryptionKeyBundleInput {
  encryptedPersonalKey: unknown;
  publicKey: PublicEncryptionKey;
}

interface UseEncryptionSetupOptions {
  getUserKeyShare: () => Promise<UserKeyShare>;
  initializeEncryptionKeyBundle: (input: InitializeEncryptionKeyBundleInput) => Promise<unknown>;
  sessionQueryKey: readonly unknown[];
}

export function useEncryptionSetup({
  getUserKeyShare,
  initializeEncryptionKeyBundle,
  sessionQueryKey,
}: UseEncryptionSetupOptions) {
  const queryClient = useQueryClient();
  const { address } = useAccount();
  const { signMessage } = useSignMessage();

  return useMutation({
    mutationFn: async () => {
      if (!address) {
        throw new Error('Wallet not connected');
      }

      const signer = normalizeAddress(address);
      const signature = await CryptoProxy.ensureSignature(signMessage, signer);
      const { keyShare } = await getUserKeyShare();
      const encryptionKeys = await CryptoProxy.generateAndWrapPersonalKey(signature, signer, keyShare);

      let requestError: unknown;

      try {
        await initializeEncryptionKeyBundle(encryptionKeys);
      } catch (error) {
        requestError = error;
      }

      await queryClient.refetchQueries({ queryKey: sessionQueryKey }, { throwOnError: true });

      const isEncryptionReady = queryClient
        .getQueriesData<User | null>({ queryKey: sessionQueryKey })
        .some(([, user]) => hasEncryptionKeyBundle(user));

      if (isEncryptionReady) {
        return;
      }

      if (requestError) {
        throw requestError;
      }

      throw new Error('Encryption key bundle was not initialized');
    },
  });
}

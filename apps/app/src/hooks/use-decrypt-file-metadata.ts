import { useCryptoUnlock } from '@comitium/auth/use-crypto-unlock';
import { CryptoProxy, type EncryptedEnvelope } from '@comitium/crypto';
import { encryptedFileMetadataContext } from '@comitium/crypto/context';
import type { WrappedKey } from '@comitium/schemas/common';
import { type FileDisplayMetadata, fileDisplayMetadataSchema } from '@comitium/schemas/forms/form-submission';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export interface FileMetadataInput {
  fileId: string;
  kind: string;
  metadata: EncryptedEnvelope;
}

interface DecryptState {
  data: Record<string, FileDisplayMetadata> | null;
  error: string | null;
  isDecrypting: boolean;
}

const INITIAL_STATE: DecryptState = { data: null, error: null, isDecrypting: false };

export function useDecryptFileMetadata(orgId: string, files: FileMetadataInput[] | null, wrappedVaultKey?: WrappedKey) {
  const [state, setState] = useState<DecryptState>(INITIAL_STATE);
  const generationRef = useRef(0);
  const { canUnlock, ensureUnlocked, isCryptoActive } = useCryptoUnlock();

  const hasFiles = !!files && files.length > 0;
  const canDecrypt = hasFiles && canUnlock && !!wrappedVaultKey;
  const fileSetKey = useMemo(() => {
    if (!files) {
      return `${orgId}:none`;
    }

    return `${orgId}:${files.map((file) => `${file.fileId}:${file.kind}:${file.metadata.ct}`).join(',')}`;
  }, [files, orgId]);

  const reset = useCallback(() => {
    generationRef.current += 1;
    setState(INITIAL_STATE);
  }, []);

  useEffect(reset, [fileSetKey, reset]);

  const decrypt = useCallback(async () => {
    if (!canDecrypt || !files || !wrappedVaultKey) {
      return;
    }

    const generation = generationRef.current + 1;
    generationRef.current = generation;
    setState((s) => ({ ...s, isDecrypting: true, error: null }));

    try {
      await ensureUnlocked();

      const entries = await Promise.all(
        files.map(async (file) => {
          const payload = await CryptoProxy.decryptApplication(
            file.metadata,
            orgId,
            wrappedVaultKey,
            encryptedFileMetadataContext(orgId, file.fileId, file.kind),
          );

          return [file.fileId, fileDisplayMetadataSchema.parse(payload)] as const;
        }),
      );

      if (generationRef.current === generation) {
        setState({ data: Object.fromEntries(entries), error: null, isDecrypting: false });
      }
    } catch {
      if (generationRef.current === generation) {
        setState({ ...INITIAL_STATE, error: 'Failed to decrypt file details. Please try again.' });
      }
    }
  }, [canDecrypt, files, wrappedVaultKey, orgId, ensureUnlocked]);

  useEffect(() => {
    if (hasFiles && isCryptoActive && !state.data && !state.isDecrypting && !state.error) {
      decrypt();
    }
  }, [hasFiles, decrypt, state.data, state.isDecrypting, state.error, isCryptoActive]);

  return { ...state, reset, retry: decrypt };
}

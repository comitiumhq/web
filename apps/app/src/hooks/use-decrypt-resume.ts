import { useCryptoUnlock } from '@comitium/auth/use-crypto-unlock';
import { CryptoProxy } from '@comitium/crypto';
import { encryptedFileContext } from '@comitium/crypto/context';
import type { WrappedKey } from '@comitium/schemas/common';
import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchEncryptedResume } from '@/lib/api/resume';
import { triggerFileDownload } from '@/lib/utils';

interface ResumeState {
  pdfData: Uint8Array | null;
  error: string | null;
  isLoading: boolean;
}

const INITIAL_STATE: ResumeState = { pdfData: null, error: null, isLoading: false };

export function useDecryptResume(
  orgId: string,
  applicationId: string | null,
  hasResume: boolean,
  resumeFileId: string | null,
  wrappedVaultKey?: WrappedKey,
  interviewEventId?: string,
) {
  const [state, setState] = useState<ResumeState>(INITIAL_STATE);
  const pdfDataRef = useRef<Uint8Array | null>(null);
  const isLoadingRef = useRef(false);
  const { canUnlock, ensureUnlocked, isCryptoActive } = useCryptoUnlock();

  const canDecrypt = hasResume && !!applicationId && !!resumeFileId && canUnlock && !!wrappedVaultKey;

  const reset = useCallback(() => {
    pdfDataRef.current = null;
    isLoadingRef.current = false;
    setState(INITIAL_STATE);
  }, []);

  // Fetch + decrypt resume. Returns true on success, false on error
  const decryptResume = useCallback(async (): Promise<boolean> => {
    if (pdfDataRef.current) {
      return true;
    }

    if (!canDecrypt || !applicationId || !resumeFileId || !wrappedVaultKey) {
      return false;
    }

    // Prevent concurrent calls (double-click)
    if (isLoadingRef.current) {
      return false;
    }

    isLoadingRef.current = true;
    setState((s) => ({ ...s, isLoading: true, error: null }));

    try {
      await ensureUnlocked();

      const encryptedBuffer = await fetchEncryptedResume(applicationId, interviewEventId);
      const data = await CryptoProxy.decryptFile(
        new Uint8Array(encryptedBuffer),
        orgId,
        wrappedVaultKey,
        encryptedFileContext(orgId, resumeFileId, 'resume'),
      );

      pdfDataRef.current = data;
      setState({ pdfData: data, error: null, isLoading: false });
      isLoadingRef.current = false;

      return true;
    } catch {
      setState({ pdfData: null, error: 'Failed to decrypt resume. Please try again.', isLoading: false });
      isLoadingRef.current = false;

      return false;
    }
  }, [canDecrypt, applicationId, resumeFileId, wrappedVaultKey, interviewEventId, orgId, ensureUnlocked]);

  // Decrypt (if needed) + trigger file download
  const downloadResume = useCallback(async () => {
    const ok = pdfDataRef.current ? true : await decryptResume();

    if (!ok || !pdfDataRef.current) {
      return;
    }

    triggerFileDownload(pdfDataRef.current, 'resume.pdf', 'application/pdf');
  }, [decryptResume]);

  // Auto-decrypt when CryptoProxy is already active (mirrors useDecryptApplication/Emails).
  useEffect(() => {
    if (hasResume && isCryptoActive && !state.pdfData && !state.isLoading && !state.error) {
      decryptResume();
    }
  }, [hasResume, isCryptoActive, decryptResume, state.pdfData, state.isLoading, state.error]);

  return { ...state, downloadResume, reset };
}

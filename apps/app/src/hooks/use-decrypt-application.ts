import { useCryptoUnlock } from '@comitium/auth/use-crypto-unlock';
import type { VaultKeyAccess } from '@comitium/crypto';
import { useCallback, useEffect, useRef, useState } from 'react';
import { type AnswerBucket, decryptAnswerBuckets } from '@/lib/forms/decrypt-answers';

interface DecryptState {
  data: Record<string, unknown> | null;
  error: string | null;
  isDecrypting: boolean;
}

const INITIAL_STATE: DecryptState = { data: null, error: null, isDecrypting: false };

export function useDecryptApplication(
  orgId: string,
  submissionId: string | null,
  formId: string | null,
  answerEnvelopes: AnswerBucket[] | null,
  vaultAccess?: VaultKeyAccess,
) {
  const [state, setState] = useState<DecryptState>(INITIAL_STATE);
  const generationRef = useRef(0);
  const { canUnlock, ensureUnlocked, isCryptoActive } = useCryptoUnlock();

  const hasAnswers = !!answerEnvelopes && answerEnvelopes.length > 0;
  const canDecrypt = hasAnswers && !!formId && canUnlock && !!vaultAccess;
  const answerSetKey = `${orgId}:${submissionId ?? 'none'}`;

  const reset = useCallback(() => {
    generationRef.current += 1;
    setState(INITIAL_STATE);
  }, []);

  useEffect(reset, [answerSetKey, reset]);

  const decrypt = useCallback(async () => {
    if (!canDecrypt || !answerEnvelopes || !formId || !vaultAccess) {
      return;
    }

    const generation = generationRef.current + 1;
    generationRef.current = generation;
    setState((s) => ({ ...s, isDecrypting: true, error: null }));

    try {
      await ensureUnlocked();

      const data = await decryptAnswerBuckets(orgId, formId, answerEnvelopes, vaultAccess);

      if (generationRef.current === generation) {
        setState({ data, error: null, isDecrypting: false });
      }
    } catch {
      if (generationRef.current === generation) {
        setState({ ...INITIAL_STATE, error: 'Failed to decrypt data. Please try again.' });
      }
    }
  }, [canDecrypt, answerEnvelopes, formId, vaultAccess, orgId, ensureUnlocked]);

  useEffect(() => {
    if (hasAnswers && isCryptoActive && !state.data && !state.error && !state.isDecrypting) {
      decrypt();
    }
  }, [hasAnswers, answerEnvelopes, decrypt, state.data, state.error, state.isDecrypting, isCryptoActive]);

  return { ...state, reset, retry: decrypt };
}

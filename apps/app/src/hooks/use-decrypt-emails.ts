import { useCryptoUnlock } from '@comitium/auth/use-crypto-unlock';
import type { EncryptedEnvelope } from '@comitium/crypto';
import { CryptoProxy } from '@comitium/crypto';
import { emailContentContext } from '@comitium/crypto/context';
import type { WrappedKey } from '@comitium/schemas/common';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { DecryptedEmail, DecryptedEmailContent, EmailResponse } from '@/lib/schemas/emails';

interface DecryptEmailsState {
  data: DecryptedEmail[] | null;
  error: string | null;
  isDecrypting: boolean;
}

export function useDecryptEmails(
  orgId: string | null,
  applicationId: string | null,
  encryptedEmails: EmailResponse[] | undefined,
  isOrgMember: boolean,
  wrappedVaultKey?: WrappedKey,
) {
  const [state, setState] = useState<DecryptEmailsState>({ data: null, error: null, isDecrypting: false });
  const { canUnlock, ensureUnlocked, isCryptoActive } = useCryptoUnlock();
  const previousApplicationIdRef = useRef(applicationId);
  const activeApplicationIdRef = useRef(applicationId);
  const decryptedApplicationIdRef = useRef<string | null>(null);

  activeApplicationIdRef.current = applicationId;

  const canDecrypt = !!encryptedEmails?.length && canUnlock && (!isOrgMember || Boolean(wrappedVaultKey));

  const reset = useCallback(() => {
    decryptedApplicationIdRef.current = null;
    setState({ data: null, error: null, isDecrypting: false });
  }, []);

  useEffect(() => {
    if (previousApplicationIdRef.current === applicationId) {
      return;
    }

    previousApplicationIdRef.current = applicationId;
    reset();
  }, [applicationId, reset]);

  const decrypt = useCallback(async () => {
    if (!canDecrypt || !encryptedEmails || !orgId || !applicationId || (isOrgMember && !wrappedVaultKey)) {
      return;
    }

    const targetApplicationId = applicationId;
    const context = emailContentContext(orgId, applicationId);
    let decryptFn: (encrypted: EncryptedEnvelope) => Promise<DecryptedEmailContent>;

    if (isOrgMember) {
      const orgWrappedVaultKey = wrappedVaultKey;

      if (!orgWrappedVaultKey) {
        return;
      }

      decryptFn = (enc) =>
        CryptoProxy.decryptEmailContentForOrganization(
          enc,
          orgId,
          orgWrappedVaultKey,
          context,
        ) as Promise<DecryptedEmailContent>;
    } else {
      decryptFn = (enc) => CryptoProxy.decryptEmailContentForApplicant(enc, context) as Promise<DecryptedEmailContent>;
    }

    setState((s) => ({ ...s, isDecrypting: true, error: null }));

    try {
      await ensureUnlocked();

      const decrypted: DecryptedEmail[] = await Promise.all(
        encryptedEmails.map(async (msg) => {
          const content = await decryptFn(msg.content);

          return {
            id: msg.id,
            senderRole: msg.senderRole,
            senderName: msg.senderName,
            content,
            createdAt: msg.createdAt,
          };
        }),
      );

      if (activeApplicationIdRef.current !== targetApplicationId) {
        return;
      }

      decryptedApplicationIdRef.current = targetApplicationId;
      setState({ data: decrypted, error: null, isDecrypting: false });
    } catch {
      if (activeApplicationIdRef.current !== targetApplicationId) {
        return;
      }

      setState((current) => ({
        ...current,
        error: 'Failed to decrypt emails. Please try again.',
        isDecrypting: false,
      }));
    }
  }, [canDecrypt, encryptedEmails, applicationId, isOrgMember, orgId, wrappedVaultKey, ensureUnlocked]);

  const hasEmails = !!encryptedEmails?.length;
  const hasEveryEmail =
    !!state.data &&
    !!encryptedEmails &&
    state.data.length === encryptedEmails.length &&
    encryptedEmails.every((email, index) => state.data?.[index]?.id === email.id);

  useEffect(() => {
    if (encryptedEmails?.length === 0 && state.data === null) {
      decryptedApplicationIdRef.current = applicationId;
      setState({ data: [], error: null, isDecrypting: false });
    }
  }, [applicationId, encryptedEmails, state.data]);

  useEffect(() => {
    if (hasEmails && isCryptoActive && !hasEveryEmail && !state.isDecrypting && !state.error) {
      decrypt();
    }
  }, [decrypt, hasEmails, hasEveryEmail, isCryptoActive, state.error, state.isDecrypting]);

  const data = decryptedApplicationIdRef.current === applicationId ? state.data : null;

  return { ...state, data, reset, retry: decrypt };
}

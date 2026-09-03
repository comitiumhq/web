import { useIsCryptoActive } from '@comitium/auth/use-is-crypto-active';
import { CryptoProxy } from '@comitium/crypto';
import { emailContentContext } from '@comitium/crypto/context';
import type { WrappedKey } from '@comitium/schemas/common';
import { logger } from '@comitium/ui/logger';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { ActivityFeedRow, DecryptedEmail, DecryptedEmailContent, EmailPayload } from '@/lib/schemas/emails';

import { getActivityEmailSenderRole } from './activity-email';

type ActivityEmailEvent = ActivityFeedRow & { applicationId: string; payload: EmailPayload };
const EMPTY_DECRYPTED_EMAILS: Record<string, DecryptedEmail> = {};
const EMPTY_EMAIL_IDS: ReadonlySet<string> = new Set();

export function useDecryptedActivityEmails(
  candidateId: string | null,
  orgId: string,
  events: ActivityFeedRow[],
  wrappedVaultKey?: WrappedKey,
) {
  const isCryptoActive = useIsCryptoActive();
  const [decryptedEmails, setDecryptedEmails] = useState<Record<string, DecryptedEmail>>({});
  const [failedEmailIds, setFailedEmailIds] = useState<ReadonlySet<string>>(EMPTY_EMAIL_IDS);
  const decryptingRef = useRef<Set<string>>(new Set());
  const decryptedEmailsRef = useRef<Record<string, DecryptedEmail>>({});
  const failedEmailIdsRef = useRef<ReadonlySet<string>>(EMPTY_EMAIL_IDS);
  const candidateIdRef = useRef(candidateId);

  candidateIdRef.current = candidateId;
  decryptedEmailsRef.current = decryptedEmails;
  failedEmailIdsRef.current = failedEmailIds;

  const decryptingEmailIds = useMemo<ReadonlySet<string>>(() => {
    if (!candidateId || !wrappedVaultKey || !isCryptoActive) {
      return EMPTY_EMAIL_IDS;
    }

    return new Set(
      events.filter(isDecryptableEmailEvent).flatMap((event) => {
        const emailId = event.payload.emailId;

        return decryptedEmails[emailId] || failedEmailIds.has(emailId) ? [] : [emailId];
      }),
    );
  }, [candidateId, decryptedEmails, events, failedEmailIds, isCryptoActive, wrappedVaultKey]);

  useEffect(() => {
    setDecryptedEmails({});
    setFailedEmailIds(EMPTY_EMAIL_IDS);
    decryptedEmailsRef.current = {};
    failedEmailIdsRef.current = EMPTY_EMAIL_IDS;
    decryptingRef.current.clear();
  }, [candidateId]);

  useEffect(() => {
    if (!candidateId || !wrappedVaultKey || !isCryptoActive) {
      return;
    }

    const pendingEventsById = new Map<string, ActivityEmailEvent>();

    for (const event of events.filter(isDecryptableEmailEvent)) {
      const emailId = event.payload.emailId;

      if (
        !decryptedEmailsRef.current[emailId] &&
        !decryptingRef.current.has(emailId) &&
        !failedEmailIdsRef.current.has(emailId) &&
        !pendingEventsById.has(emailId)
      ) {
        pendingEventsById.set(emailId, event);
      }
    }

    const pendingEvents = [...pendingEventsById.values()];

    if (pendingEvents.length === 0) {
      return;
    }

    const activeCandidateId = candidateId;
    const decryptions = pendingEvents.map(async (event) => {
      decryptingRef.current.add(event.payload.emailId);

      try {
        const content = (await CryptoProxy.decryptEmailContentForOrganization(
          event.payload.content,
          orgId,
          wrappedVaultKey,
          emailContentContext(orgId, event.applicationId),
        )) as DecryptedEmailContent;

        return {
          id: event.payload.emailId,
          senderRole: getActivityEmailSenderRole(event.type),
          senderName: event.actor.name,
          content,
          createdAt: event.createdAt,
        } satisfies DecryptedEmail;
      } catch (error) {
        if (candidateIdRef.current === activeCandidateId) {
          setFailedEmailIds((current) => new Set(current).add(event.payload.emailId));
        }

        if (import.meta.env.DEV) {
          logger.warn(`Failed to decrypt activity email ${event.payload.emailId}:`, error);
        }

        return null;
      } finally {
        decryptingRef.current.delete(event.payload.emailId);
      }
    });

    Promise.all(decryptions).then((results) => {
      if (candidateIdRef.current !== activeCandidateId) {
        return;
      }

      const decryptedEntries = results.flatMap((email) => (email ? [[email.id, email] as const] : []));

      if (decryptedEntries.length > 0) {
        setDecryptedEmails((current) => ({ ...current, ...Object.fromEntries(decryptedEntries) }));
      }
    });
  }, [candidateId, events, isCryptoActive, orgId, wrappedVaultKey]);

  return {
    decryptedEmails: isCryptoActive ? decryptedEmails : EMPTY_DECRYPTED_EMAILS,
    decryptingEmailIds: isCryptoActive ? decryptingEmailIds : EMPTY_EMAIL_IDS,
    failedEmailIds: isCryptoActive ? failedEmailIds : EMPTY_EMAIL_IDS,
  };
}

function isDecryptableEmailEvent(event: ActivityFeedRow): event is ActivityEmailEvent {
  return event.applicationId !== null && event.payload.kind === 'email';
}

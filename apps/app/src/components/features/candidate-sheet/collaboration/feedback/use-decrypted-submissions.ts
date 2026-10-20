import { useIsCryptoActive } from '@comitium/auth/use-is-crypto-active';
import type { VaultKeyAccess } from '@comitium/crypto';
import { getErrorMessage } from '@comitium/schemas/error';
import { useEffect, useRef, useState } from 'react';
import { decryptFeedbackBuckets } from '@/lib/forms/decrypt-answers';
import type { FeedbackSubmission } from '@/lib/schemas/feedback-submissions';

import type { DecryptedEntry } from './types';

export function useDecryptedSubmissions(
  submissions: FeedbackSubmission[],
  orgId: string,
  vaultAccess?: VaultKeyAccess,
) {
  const [entries, setEntries] = useState<Map<string, DecryptedEntry>>(new Map());
  const startedRef = useRef<Set<string>>(new Set());
  const isCryptoActive = useIsCryptoActive();

  useEffect(() => {
    if (!vaultAccess || !isCryptoActive) {
      return;
    }

    const newSubmissions = submissions.filter((s) => !startedRef.current.has(s.id));

    if (newSubmissions.length === 0) {
      return;
    }

    for (const s of newSubmissions) {
      startedRef.current.add(s.id);
    }

    setEntries((prev) => {
      const next = new Map(prev);

      for (const s of newSubmissions) {
        next.set(s.id, { status: 'loading' });
      }

      return next;
    });

    Promise.all(newSubmissions.map((s) => decryptOne(s, orgId, vaultAccess))).then((results) => {
      setEntries((prev) => {
        const next = new Map(prev);

        for (const [id, entry] of results) {
          next.set(id, entry);
        }

        return next;
      });
    });
  }, [submissions, orgId, vaultAccess, isCryptoActive]);

  return entries;
}

async function decryptOne(
  submission: FeedbackSubmission,
  orgId: string,
  vaultAccess: VaultKeyAccess,
): Promise<[string, DecryptedEntry]> {
  try {
    if (!submission.applicationId) {
      throw new Error('Feedback submission is not attached to an application');
    }

    const values = await decryptFeedbackBuckets(
      orgId,
      submission.applicationId,
      submission.formId,
      submission.answerEnvelopes,
      vaultAccess,
    );

    return [submission.id, { status: 'ready', values }];
  } catch (err) {
    return [submission.id, { status: 'error', message: getErrorMessage(err) }];
  }
}

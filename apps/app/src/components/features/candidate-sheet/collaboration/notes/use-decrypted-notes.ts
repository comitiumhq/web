import { useIsCryptoActive } from '@comitium/auth/use-is-crypto-active';
import { CryptoProxy } from '@comitium/crypto';
import { candidateNoteContext } from '@comitium/crypto/context';
import type { TipTapDoc } from '@comitium/schemas/common';
import { logger } from '@comitium/ui/logger';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useQueryCandidateActivity } from '@/hooks/queries/use-query-candidate-activity';
import { useQueryCandidateNotes } from '@/hooks/queries/use-query-candidate-notes';
import { useQueryWrappedVaultKey } from '@/hooks/queries/use-query-wrapped-vault-key';
import { parseDecryptedTipTapDoc } from '@/lib/crypto/decrypted-payloads';
import type { ActivityFeedRow, NotePayload } from '@/lib/schemas/emails';

type NoteEvent = ActivityFeedRow & { payload: NotePayload };
const EMPTY_DECRYPTED_NOTES: Record<string, TipTapDoc> = {};
const EMPTY_NOTE_IDS: ReadonlySet<string> = new Set();

export function useDecryptedNotes(applicationId: string | null, orgId: string, candidateId: string | null) {
  const { data: activityData } = useQueryCandidateActivity(candidateId, applicationId);
  const notesQuery = useQueryCandidateNotes(candidateId);
  const {
    data: wrappedVaultKey,
    isLoading: isVaultKeyLoading,
    isError: isVaultKeyError,
  } = useQueryWrappedVaultKey(orgId);
  const isCryptoActive = useIsCryptoActive();

  const [decryptedNotes, setDecryptedNotes] = useState<Record<string, TipTapDoc>>({});
  const [failedNoteIds, setFailedNoteIds] = useState<ReadonlySet<string>>(EMPTY_NOTE_IDS);
  const decryptingRef = useRef<Set<string>>(new Set());
  const decryptedNotesRef = useRef<Record<string, TipTapDoc>>({});
  const failedNoteIdsRef = useRef<ReadonlySet<string>>(EMPTY_NOTE_IDS);
  const candidateIdRef = useRef(candidateId);

  candidateIdRef.current = candidateId;
  decryptedNotesRef.current = decryptedNotes;
  failedNoteIdsRef.current = failedNoteIds;

  const encryptedNotes = useMemo(() => {
    const activityNotes = activityData?.data.filter((event): event is NoteEvent => event.payload.kind === 'note') ?? [];

    return [
      ...notesQuery.notes.map((note) => ({ id: note.id, content: note.content })),
      ...activityNotes.map((note) => ({ id: note.payload.noteId, content: note.payload.content })),
    ];
  }, [activityData?.data, notesQuery.notes]);

  const decryptingNoteIds = useMemo<ReadonlySet<string>>(() => {
    if (!isCryptoActive || !candidateId || (!wrappedVaultKey && !isVaultKeyLoading)) {
      return EMPTY_NOTE_IDS;
    }

    return new Set(
      encryptedNotes.flatMap((note) => (decryptedNotes[note.id] || failedNoteIds.has(note.id) ? [] : [note.id])),
    );
  }, [candidateId, decryptedNotes, encryptedNotes, failedNoteIds, isCryptoActive, isVaultKeyLoading, wrappedVaultKey]);

  useEffect(() => {
    setDecryptedNotes({});
    setFailedNoteIds(EMPTY_NOTE_IDS);
    decryptedNotesRef.current = {};
    failedNoteIdsRef.current = EMPTY_NOTE_IDS;
    decryptingRef.current.clear();
  }, [candidateId]);

  useEffect(() => {
    if (!wrappedVaultKey || !isCryptoActive || !candidateId) {
      return;
    }

    const activeCandidateId = candidateId;

    for (const note of encryptedNotes) {
      const noteId = note.id;

      if (
        decryptedNotesRef.current[noteId] ||
        decryptingRef.current.has(noteId) ||
        failedNoteIdsRef.current.has(noteId)
      ) {
        continue;
      }

      decryptingRef.current.add(noteId);

      CryptoProxy.decryptApplication(note.content, orgId, wrappedVaultKey, candidateNoteContext(orgId, candidateId))
        .then((data) => {
          if (candidateIdRef.current !== activeCandidateId) {
            return;
          }

          const doc = parseDecryptedTipTapDoc(data);

          if (!doc) {
            throw new Error('Invalid decrypted note content');
          }

          setDecryptedNotes((prev) => ({ ...prev, [noteId]: doc }));
        })
        .catch((error) => {
          if (candidateIdRef.current !== activeCandidateId) {
            return;
          }

          setFailedNoteIds((current) => new Set(current).add(noteId));

          if (import.meta.env.DEV) {
            logger.warn(`Failed to decrypt note ${noteId}:`, error);
          }
        })
        .finally(() => {
          decryptingRef.current.delete(noteId);
        });
    }
  }, [candidateId, encryptedNotes, isCryptoActive, orgId, wrappedVaultKey]);

  return {
    decryptedNotes: isCryptoActive ? decryptedNotes : EMPTY_DECRYPTED_NOTES,
    decryptingNoteIds: isCryptoActive ? decryptingNoteIds : EMPTY_NOTE_IDS,
    failedNoteIds: isCryptoActive ? failedNoteIds : EMPTY_NOTE_IDS,
    isVaultKeyError: isVaultKeyError && !wrappedVaultKey,
    ...notesQuery,
  };
}

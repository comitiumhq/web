import { useCryptoUnlock } from '@comitium/auth/use-crypto-unlock';
import type { PublicEncryptionKey } from '@comitium/crypto';
import { CryptoProxy } from '@comitium/crypto';
import { candidateTagContext } from '@comitium/crypto/context';
import { normalizeTagLabel } from '@comitium/crypto/tag-hash';
import type { WrappedKey } from '@comitium/schemas/common';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { showMutationError } from '@/hooks/mutations/mutation-error';
import { qk } from '@/hooks/query-keys';
import {
  archiveCandidateTag,
  assignTagToCandidate,
  createCandidateTag,
  restoreCandidateTag,
  unassignTagFromCandidate,
  updateCandidateTag,
} from '@/lib/api/candidate-tags';
import type { CreateCandidateTagBody } from '@/lib/schemas/candidate-tags';

function invalidateAllTags(queryClient: ReturnType<typeof useQueryClient>, orgId: string) {
  queryClient.invalidateQueries({ queryKey: qk.candidate.tags(orgId) });
}

export function invalidateCandidateTagSurfaces(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: qk.pipeline.candidatesRoot() });
  queryClient.invalidateQueries({ queryKey: qk.application.root() });
  queryClient.invalidateQueries({ queryKey: qk.candidate.activityRoot() });
  queryClient.invalidateQueries({
    predicate: (query) => qk.jobs.isKanban(query.queryKey),
  });
}

export async function buildEncryptedLabel(
  orgId: string,
  label: string,
  vaultPublicKey: PublicEncryptionKey,
  vaultKeyVersion: number,
  wrappedVaultKey: WrappedKey,
): Promise<CreateCandidateTagBody> {
  const displayLabel = label.trim();
  const normalizedForHash = normalizeTagLabel(label);
  const [labelCiphertext, labelHash] = await Promise.all([
    CryptoProxy.encryptApplication(
      vaultPublicKey,
      vaultKeyVersion,
      { label: displayLabel },
      candidateTagContext(orgId),
    ),
    CryptoProxy.hashTagLabel(orgId, wrappedVaultKey, normalizedForHash),
  ]);

  return { label: labelCiphertext, labelHash };
}

// --- Create ---

interface CreateTagParams {
  orgId: string;
  label: string;
  vaultPublicKey: PublicEncryptionKey;
  vaultKeyVersion: number;
  wrappedVaultKey: WrappedKey;
}

export function useCreateCandidateTag() {
  const queryClient = useQueryClient();
  const { ensureUnlocked } = useCryptoUnlock();

  return useMutation({
    mutationFn: async ({ orgId, label, vaultPublicKey, vaultKeyVersion, wrappedVaultKey }: CreateTagParams) => {
      await ensureUnlocked();
      const body = await buildEncryptedLabel(orgId, label, vaultPublicKey, vaultKeyVersion, wrappedVaultKey);

      return createCandidateTag(orgId, body);
    },

    onSuccess: (_, { orgId }) => {
      toast.success('Tag created');
      invalidateAllTags(queryClient, orgId);
    },

    onError: showMutationError,
  });
}

// --- Rename ---

interface RenameTagParams extends CreateTagParams {
  tagId: string;
}

export function useRenameCandidateTag() {
  const queryClient = useQueryClient();
  const { ensureUnlocked } = useCryptoUnlock();

  return useMutation({
    mutationFn: async ({ orgId, tagId, label, vaultPublicKey, vaultKeyVersion, wrappedVaultKey }: RenameTagParams) => {
      await ensureUnlocked();
      const body = await buildEncryptedLabel(orgId, label, vaultPublicKey, vaultKeyVersion, wrappedVaultKey);

      return updateCandidateTag(orgId, tagId, body);
    },

    onSuccess: (_, { orgId }) => {
      toast.success('Tag renamed');
      invalidateAllTags(queryClient, orgId);
    },

    onError: showMutationError,
  });
}

// --- Archive / Restore ---

interface TagActionParams {
  orgId: string;
  tagId: string;
}

export function useArchiveCandidateTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orgId, tagId }: TagActionParams) => archiveCandidateTag(orgId, tagId),

    onSuccess: (_, { orgId }) => {
      toast.success('Tag archived');
      invalidateAllTags(queryClient, orgId);
    },

    onError: showMutationError,
  });
}

export function useRestoreCandidateTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orgId, tagId }: TagActionParams) => restoreCandidateTag(orgId, tagId),

    onSuccess: (_, { orgId }) => {
      toast.success('Tag restored');
      invalidateAllTags(queryClient, orgId);
    },

    onError: showMutationError,
  });
}

// --- Assign / Unassign ---

interface AssignTagParams {
  candidateId: string;
  tagId: string;
  orgId: string;
}

export function useAssignTagToCandidate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ candidateId, tagId }: AssignTagParams) => assignTagToCandidate(candidateId, { tagId }),

    onSuccess: () => {
      invalidateCandidateTagSurfaces(queryClient);
    },

    onError: showMutationError,
  });
}

export function useUnassignTagFromCandidate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ candidateId, tagId }: AssignTagParams) => unassignTagFromCandidate(candidateId, tagId),

    onSuccess: () => {
      invalidateCandidateTagSurfaces(queryClient);
    },

    onError: showMutationError,
  });
}

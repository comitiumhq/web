import { useCryptoUnlock } from '@comitium/auth/use-crypto-unlock';
import type { PublicEncryptionKey, VaultKeyAccess } from '@comitium/crypto';
import { CryptoProxy } from '@comitium/crypto';
import { candidateTagContext } from '@comitium/crypto/context';
import { type QueryClient, useMutation, useQueryClient } from '@tanstack/react-query';
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

function invalidateAllTags(queryClient: QueryClient, orgId: string) {
  queryClient.invalidateQueries({ queryKey: qk.candidate.tags(orgId) });
}

export function invalidateCandidateTagSurfaces(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: qk.pipeline.candidatesRoot() });
  queryClient.invalidateQueries({ queryKey: qk.application.root() });
  queryClient.invalidateQueries({ queryKey: qk.candidate.activityRoot() });
  queryClient.invalidateQueries({
    predicate: (query) => qk.jobs.isKanban(query.queryKey),
  });
  queryClient.invalidateQueries({ queryKey: qk.candidate.directoryRoot() });
}

export async function buildEncryptedLabel(
  orgId: string,
  label: string,
  vaultPublicKey: PublicEncryptionKey,
  vaultKeyVersion: number,
  vaultAccess: VaultKeyAccess,
): Promise<CreateCandidateTagBody> {
  const displayLabel = label.trim();
  const [labelCiphertext, labelHash] = await Promise.all([
    CryptoProxy.encryptApplication(
      vaultPublicKey,
      vaultKeyVersion,
      { label: displayLabel },
      candidateTagContext(orgId),
    ),
    CryptoProxy.hashTagLabel(orgId, vaultAccess, label),
  ]);

  return { label: labelCiphertext, labelHash };
}

interface CreateTagParams {
  orgId: string;
  label: string;
  vaultPublicKey: PublicEncryptionKey;
  vaultKeyVersion: number;
  vaultAccess: VaultKeyAccess;
}

export function useCreateCandidateTag() {
  const queryClient = useQueryClient();
  const { ensureUnlocked } = useCryptoUnlock();

  return useMutation({
    mutationFn: async ({ orgId, label, vaultPublicKey, vaultKeyVersion, vaultAccess }: CreateTagParams) => {
      await ensureUnlocked();

      const body = await buildEncryptedLabel(orgId, label, vaultPublicKey, vaultKeyVersion, vaultAccess);

      return createCandidateTag(orgId, body);
    },

    onSuccess: (_, { orgId }) => {
      toast.success('Tag created');
      invalidateAllTags(queryClient, orgId);
    },

    onError: showMutationError,
  });
}

interface RenameTagParams extends CreateTagParams {
  tagId: string;
}

export function useRenameCandidateTag() {
  const queryClient = useQueryClient();
  const { ensureUnlocked } = useCryptoUnlock();

  return useMutation({
    mutationFn: async ({ orgId, tagId, label, vaultPublicKey, vaultKeyVersion, vaultAccess }: RenameTagParams) => {
      await ensureUnlocked();

      const body = await buildEncryptedLabel(orgId, label, vaultPublicKey, vaultKeyVersion, vaultAccess);

      return updateCandidateTag(orgId, tagId, body);
    },

    onSuccess: (_, { orgId }) => {
      toast.success('Tag renamed');
      invalidateAllTags(queryClient, orgId);
    },

    onError: showMutationError,
  });
}

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

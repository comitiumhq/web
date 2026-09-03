import { useCryptoUnlock } from '@comitium/auth/use-crypto-unlock';
import type { FieldTypeId } from '@comitium/schemas/forms';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useQueryOrgVaultKey } from '@/hooks/queries/use-query-org-vault-key';
import { useQueryWrappedVaultKey } from '@/hooks/queries/use-query-wrapped-vault-key';
import { qk } from '@/hooks/query-keys';
import { batchWriteCandidateCustomFieldValues } from '@/lib/api/candidate-custom-field-values';
import { encodeCandidateCustomFieldValue } from '@/lib/forms/custom-field-value-codec';
import type { BatchCandidateCustomFieldValueItem } from '@/lib/schemas/candidate-custom-field-values';
import { isDefined } from '@/lib/utils';

export interface BatchSaveCustomFieldItem {
  fieldId: string;
  fieldType: FieldTypeId;
  value: unknown;
}

function isEmpty(value: unknown): boolean {
  if (!isDefined(value)) {
    return true;
  }

  if (typeof value === 'string' && value.trim() === '') {
    return true;
  }

  if (Array.isArray(value) && value.length === 0) {
    return true;
  }

  return false;
}

interface UseBatchSaveCustomFieldValuesArgs {
  orgId: string;
  candidateId: string;
}

export function useBatchSaveCustomFieldValues({ orgId, candidateId }: UseBatchSaveCustomFieldValuesArgs) {
  const queryClient = useQueryClient();
  const { data: vaultKey } = useQueryOrgVaultKey(orgId);
  const { data: wrappedVaultKey } = useQueryWrappedVaultKey(orgId);
  const { ensureUnlocked } = useCryptoUnlock();

  return useMutation({
    mutationFn: async (items: BatchSaveCustomFieldItem[]) => {
      if (!vaultKey || !wrappedVaultKey) {
        throw new Error('Vault not ready — unlock encryption first');
      }

      await ensureUnlocked();

      const updates: BatchCandidateCustomFieldValueItem[] = await Promise.all(
        items.map(async (item) => {
          if (isEmpty(item.value)) {
            return { fieldId: item.fieldId, encryptedValue: null };
          }

          const { encryptedValue, valueHash } = await encodeCandidateCustomFieldValue({
            orgId,
            candidateId,
            fieldId: item.fieldId,
            fieldType: item.fieldType,
            value: item.value,
            vaultPublicKey: vaultKey.vaultPublicKey,
            vaultKeyVersion: vaultKey.keyVersion,
            wrappedVaultKey,
          });

          return { fieldId: item.fieldId, encryptedValue, valueHash };
        }),
      );

      return batchWriteCandidateCustomFieldValues(candidateId, { updates });
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.application.candidateCustomFieldValues(candidateId) });
    },

    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

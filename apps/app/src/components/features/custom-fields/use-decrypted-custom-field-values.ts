import { useIsCryptoActive } from '@comitium/auth/use-is-crypto-active';
import { CryptoProxy } from '@comitium/crypto';
import { customFieldValueContext } from '@comitium/crypto/context';
import { logger } from '@comitium/ui/logger';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useQueryCandidateCustomFieldValues } from '@/hooks/queries/use-query-candidate-custom-field-values';
import { useQueryOrgVaultAccess } from '@/hooks/queries/use-query-org-vault-access';

type DecryptedMap = Record<string, unknown>;
const EMPTY_VALUE_IDS: ReadonlySet<string> = new Set();

interface UseDecryptedCustomFieldValuesResult {
  values: ReturnType<typeof useQueryCandidateCustomFieldValues>['data'];
  decrypted: DecryptedMap;
  decryptingValueIds: ReadonlySet<string>;
  failedValueIds: ReadonlySet<string>;
  isVaultKeyError: boolean;
  isLoading: boolean;
  isQueryError: boolean;
  refetch: ReturnType<typeof useQueryCandidateCustomFieldValues>['refetch'];
}

export function useDecryptedCustomFieldValues(
  candidateId: string | null,
  orgId: string,
): UseDecryptedCustomFieldValuesResult {
  const { data: values, isLoading, isError: isQueryError, refetch } = useQueryCandidateCustomFieldValues(candidateId);
  const { data: vaultAccess, isLoading: isVaultKeyLoading, isError: isVaultKeyError } = useQueryOrgVaultAccess(orgId);
  const isCryptoActive = useIsCryptoActive();

  const [decrypted, setDecrypted] = useState<DecryptedMap>({});
  const [failedValueIds, setFailedValueIds] = useState<ReadonlySet<string>>(EMPTY_VALUE_IDS);
  const decryptingRef = useRef<Set<string>>(new Set());
  const decryptedRef = useRef<DecryptedMap>({});
  const failedValueIdsRef = useRef<ReadonlySet<string>>(EMPTY_VALUE_IDS);
  const candidateIdRef = useRef(candidateId);

  candidateIdRef.current = candidateId;
  decryptedRef.current = decrypted;
  failedValueIdsRef.current = failedValueIds;

  const decryptingValueIds = useMemo<ReadonlySet<string>>(() => {
    if (!isCryptoActive || !candidateId || (!vaultAccess && !isVaultKeyLoading)) {
      return EMPTY_VALUE_IDS;
    }

    return new Set(
      (values?.data ?? []).flatMap((row) => (row.id in decrypted || failedValueIds.has(row.id) ? [] : [row.id])),
    );
  }, [candidateId, decrypted, failedValueIds, isCryptoActive, isVaultKeyLoading, values?.data, vaultAccess]);

  useEffect(() => {
    setDecrypted({});
    setFailedValueIds(EMPTY_VALUE_IDS);
    decryptedRef.current = {};
    failedValueIdsRef.current = EMPTY_VALUE_IDS;
    decryptingRef.current.clear();
  }, [candidateId]);

  useEffect(() => {
    if (!values?.data || !vaultAccess || !isCryptoActive || !candidateId) {
      return;
    }

    for (const row of values.data) {
      if (
        row.id in decryptedRef.current ||
        decryptingRef.current.has(row.id) ||
        failedValueIdsRef.current.has(row.id)
      ) {
        continue;
      }

      const activeCandidateId = candidateId;

      decryptingRef.current.add(row.id);
      CryptoProxy.decryptApplication(
        row.value,
        orgId,
        vaultAccess,
        customFieldValueContext(orgId, candidateId, row.fieldId),
      )
        .then((plain) => {
          if (candidateIdRef.current !== activeCandidateId) {
            return;
          }

          setDecrypted((prev) => ({ ...prev, [row.id]: plain }));
        })
        .catch((error) => {
          if (candidateIdRef.current !== activeCandidateId) {
            return;
          }

          setFailedValueIds((current) => new Set(current).add(row.id));

          if (import.meta.env.DEV) {
            logger.warn(`Failed to decrypt custom field value ${row.id}:`, error);
          }
        })
        .finally(() => {
          decryptingRef.current.delete(row.id);
        });
    }
  }, [values, vaultAccess, isCryptoActive, orgId, candidateId]);

  return {
    values,
    decrypted,
    decryptingValueIds: isCryptoActive ? decryptingValueIds : EMPTY_VALUE_IDS,
    failedValueIds: isCryptoActive ? failedValueIds : EMPTY_VALUE_IDS,
    isVaultKeyError: isVaultKeyError && !vaultAccess,
    isLoading,
    isQueryError: isQueryError && values === undefined,
    refetch,
  };
}

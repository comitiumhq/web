import { useIsCryptoActive } from '@comitium/auth/use-is-crypto-active';
import { CryptoProxy } from '@comitium/crypto';
import { criterionEvidenceContext } from '@comitium/crypto/context';
import { type CriterionEvidence, criterionEvidenceSchema } from '@comitium/schemas/applications';
import type { EncryptedEnvelope, WrappedKey } from '@comitium/schemas/common';
import { useEffect, useState } from 'react';

export type CriterionEvidenceState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; evidence: CriterionEvidence }
  | { status: 'error' };

interface UseCriterionEvidenceParams {
  applicationId: string;
  criterionId: string;
  encryptedEvidence: EncryptedEnvelope | null;
  orgId: string;
  wrappedVaultKey: WrappedKey | undefined;
  enabled: boolean;
}

export function useCriterionEvidence({
  applicationId,
  criterionId,
  encryptedEvidence,
  orgId,
  wrappedVaultKey,
  enabled,
}: UseCriterionEvidenceParams): CriterionEvidenceState {
  const [state, setState] = useState<CriterionEvidenceState>({ status: 'idle' });
  const isCryptoActive = useIsCryptoActive();

  useEffect(() => {
    setState({ status: 'idle' });
  }, [applicationId, criterionId, encryptedEvidence]);

  useEffect(() => {
    if (!enabled || !encryptedEvidence || !wrappedVaultKey || !isCryptoActive) {
      return;
    }

    let cancelled = false;
    setState({ status: 'loading' });

    CryptoProxy.decryptApplication(
      encryptedEvidence,
      orgId,
      wrappedVaultKey,
      criterionEvidenceContext(orgId, applicationId, criterionId),
    )
      .then((payload) => criterionEvidenceSchema.parse(payload))
      .then((evidence) => {
        if (!cancelled) {
          setState({ status: 'ready', evidence });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setState({ status: 'error' });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [applicationId, criterionId, enabled, encryptedEvidence, isCryptoActive, orgId, wrappedVaultKey]);

  return state;
}

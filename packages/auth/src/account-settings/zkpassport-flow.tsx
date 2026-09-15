import { isDefined } from '@comitium/schemas/guards';
import { NullifierType, type ProofResult, type QueryBuilder } from '@zkpassport/sdk';
import { ZKPassportQRCode } from '@zkpassport/ui/react';
import { useTheme } from 'next-themes';
import { useCallback, useRef } from 'react';

import type { CompleteZkIdentityAttemptInput, ZkIdentityAttempt } from '../zk-identity';

export function ZkPassportFlow({
  attempt,
  onComplete,
}: {
  attempt: ZkIdentityAttempt;
  onComplete: (input: CompleteZkIdentityAttemptInput) => void;
}) {
  const { resolvedTheme } = useTheme();
  const proofsByIndex = useRef(new Map<number, ProofResult>());
  const submitted = useRef(false);
  const theme = resolvedTheme === 'dark' ? 'dark' : 'light';

  const buildQuery = useCallback(
    (builder: QueryBuilder) => builder.policy(attempt.request.policyId).bind('custom_data', attempt.challenge).done(),
    [attempt],
  );

  const submitProofs = useCallback(
    (proof: ProofResult) => {
      if (submitted.current) {
        return;
      }

      const proofs = collectCompleteProofSet(proofsByIndex.current, proof);

      if (!isDefined(proofs)) {
        return;
      }

      submitted.current = true;
      onComplete({
        challenge: attempt.challenge,
        proofs,
      });
    },
    [attempt.challenge, onComplete],
  );

  const resetProofs = useCallback(() => {
    if (!submitted.current) {
      proofsByIndex.current.clear();
    }
  }, []);

  return (
    <div className="flex min-w-0 justify-center">
      <ZKPassportQRCode
        name="Comitium"
        domain={attempt.request.domain}
        mode={attempt.request.proofMode}
        oprfKeyId={attempt.request.oprfKeyId}
        uniqueIdentifierType={NullifierType.SALTED}
        theme={theme}
        query={buildQuery}
        onProofGenerated={submitProofs}
        onRetryClicked={resetProofs}
      />
    </div>
  );
}

function collectCompleteProofSet(proofsByIndex: Map<number, ProofResult>, proof: ProofResult): ProofResult[] | null {
  const { index, total } = proof;

  if (!isDefined(index) || !isDefined(total) || index < 0 || total < 1 || index >= total) {
    return null;
  }

  proofsByIndex.set(index, proof);

  if (proofsByIndex.size !== total) {
    return null;
  }

  const proofs: ProofResult[] = [];

  for (let proofIndex = 0; proofIndex < total; proofIndex += 1) {
    const candidate = proofsByIndex.get(proofIndex);

    if (!isDefined(candidate) || candidate.total !== total) {
      return null;
    }

    proofs.push(candidate);
  }

  return proofs;
}

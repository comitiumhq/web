import { useEffect, useState } from 'react';

import type { CompleteZkIdentityAttemptInput, ZkIdentityAttempt, ZkIdentityStatus } from '../zk-identity';

type ZkPassportRequestState =
  | { stage: 'preparing' }
  | { stage: 'waiting'; qrCode: string; url: string }
  | { stage: 'scanned' | 'generating' | 'submitting' }
  | { stage: 'error' | 'rejected' };

export function useZkPassportRequest(
  attempt: ZkIdentityAttempt,
  onComplete: (input: CompleteZkIdentityAttemptInput) => Promise<ZkIdentityStatus>,
): ZkPassportRequestState {
  const [requestState, setRequestState] = useState<ZkPassportRequestState>({ stage: 'preparing' });

  useEffect(() => {
    let cancelled = false;
    let cancelRequest: (() => void) | undefined;

    const updateRequestState = (nextState: ZkPassportRequestState) => {
      if (!cancelled) {
        setRequestState(nextState);
      }
    };

    const prepareRequest = async () => {
      try {
        const [zkPassportSdk, qrCode] = await Promise.all([import('@zkpassport/sdk'), import('qrcode')]);

        if (cancelled) {
          return;
        }

        const { NullifierType, ZKPassport } = zkPassportSdk;
        const zkPassport = new ZKPassport(attempt.request.domain, { disableProofStorage: true });

        const builder = await zkPassport.request({
          name: 'Comitium',
          purpose: attempt.request.purpose,
          scope: attempt.request.scope,
          mode: attempt.request.proofMode,
          validity: attempt.request.validitySeconds,
          devMode: attempt.request.devMode,
          uniqueIdentifierType: NullifierType.SALTED,
        });

        const zkPassportRequest = builder
          .gte('age', attempt.request.minimumAge)
          .facematch('strict')
          .bind('custom_data', attempt.challenge)
          .done();

        cancelRequest = () => zkPassport.cancelRequest(zkPassportRequest.requestId);

        if (cancelled) {
          cancelRequest();
          return;
        }

        zkPassportRequest.onRequestReceived(() => updateRequestState({ stage: 'scanned' }));
        zkPassportRequest.onGeneratingProof(() => updateRequestState({ stage: 'generating' }));
        zkPassportRequest.onReject(() => updateRequestState({ stage: 'rejected' }));
        zkPassportRequest.onError(() => updateRequestState({ stage: 'error' }));
        zkPassportRequest.onResult(async ({ proofs, result: queryResult }) => {
          if (cancelled) {
            return;
          }

          updateRequestState({ stage: 'submitting' });

          try {
            await onComplete({
              originalQuery: zkPassportRequest.query,
              proofs,
              queryResult,
            });
          } catch {
            updateRequestState({ stage: 'error' });
          }
        });

        const qrCodeDataUrl = await qrCode.toDataURL(zkPassportRequest.url, {
          errorCorrectionLevel: 'M',
          margin: 1,
          width: 280,
        });

        if (!cancelled) {
          setRequestState((currentState) =>
            currentState.stage === 'preparing'
              ? { stage: 'waiting', qrCode: qrCodeDataUrl, url: zkPassportRequest.url }
              : currentState,
          );
        }
      } catch {
        updateRequestState({ stage: 'error' });
      }
    };

    void prepareRequest();

    return () => {
      cancelled = true;
      cancelRequest?.();
    };
  }, [attempt, onComplete]);

  return requestState;
}

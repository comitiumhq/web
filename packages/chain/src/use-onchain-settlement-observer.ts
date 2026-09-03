import { useCallback, useState } from 'react';

import { refreshAfterOnchainOperationSettles } from './onchain-operation-observer';

interface ObserveOnchainSettlementParams {
  operationId: string;
  refresh: () => void;
  onCompleted: () => Promise<void> | void;
  onFailed: () => Promise<void> | void;
}

export function useOnchainSettlementObserver() {
  const [operationId, setOperationId] = useState<string | null>(null);

  const observe = useCallback(
    ({ operationId: nextOperationId, refresh, onCompleted, onFailed }: ObserveOnchainSettlementParams) => {
      setOperationId(nextOperationId);

      refreshAfterOnchainOperationSettles(nextOperationId, refresh).then(
        async (stage) => {
          try {
            if (stage === 'completed') {
              await onCompleted();

              return;
            }

            if (stage === 'failed') {
              await onFailed();
            }
          } finally {
            setOperationId((current) => (current === nextOperationId ? null : current));
          }
        },
        () => {
          setOperationId((current) => (current === nextOperationId ? null : current));
        },
      );
    },
    [],
  );

  return {
    observe,
    isConfirming: operationId !== null,
  };
}

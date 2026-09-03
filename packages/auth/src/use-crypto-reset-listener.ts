import { usePrivy } from '@privy-io/react-auth';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { LS_LAST_ORG_ID } from './storage';

interface CryptoResetSubscriber {
  onResetComplete: () => void;
  onResetStart: () => Promise<void>;
}

type SubscribeToCryptoReset = (subscriber: CryptoResetSubscriber) => () => void;

export function useCryptoResetListener(subscribe: SubscribeToCryptoReset) {
  const { authenticated, logout } = usePrivy();
  const queryClient = useQueryClient();

  useEffect(
    () =>
      subscribe({
        onResetStart: async () => {
          if (authenticated) {
            await logout();
          }

          queryClient.clear();
          globalThis.localStorage?.removeItem(LS_LAST_ORG_ID);
        },
        onResetComplete: () => undefined,
      }),
    [authenticated, logout, queryClient, subscribe],
  );
}

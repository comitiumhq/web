import { UnlockApiError } from '@comitium/crypto';
import { ApiError } from '@comitium/schemas/api-errors';
import { createContext, type ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';

import { useAuthClient } from './auth-context';
import { ReauthenticationDialog } from './reauthentication-dialog';

type RunWithFreshAuth = <T>(operation: () => Promise<T>) => Promise<T>;
type Confirmation = { userId: string; email: string; resolve: () => void; reject: (error: Error) => void };

const FreshAuthContext = createContext<RunWithFreshAuth | null>(null);

export function FreshAuthentication({ children }: { children: ReactNode }) {
  const client = useAuthClient();
  const { data } = client.useSession();
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const activeConfirmation = useRef<Confirmation | null>(null);
  const pending = useRef<Promise<void> | null>(null);

  const cancel = useCallback(() => {
    activeConfirmation.current?.reject(new Error('Sign-in confirmation cancelled'));
    activeConfirmation.current = null;
    setConfirmation(null);
  }, []);

  useEffect(() => {
    if (activeConfirmation.current && activeConfirmation.current.userId !== data?.user.id) {
      cancel();
    }
  }, [cancel, data?.user.id]);

  useEffect(
    () => () => {
      activeConfirmation.current?.reject(new Error('Sign-in confirmation cancelled'));
    },
    [],
  );

  const requestConfirmation = useCallback(
    (userId: string) => {
      const user = client.$store.atoms.session.get().data?.user;

      if (!user || user.id !== userId) {
        return Promise.reject(new ApiError(401, 'Authentication identity changed'));
      }

      if (pending.current) {
        return pending.current;
      }

      const promise = new Promise<void>((resolve, reject) => {
        const request = { userId: user.id, email: user.email, resolve, reject };

        activeConfirmation.current = request;
        setConfirmation(request);
      }).finally(() => {
        pending.current = null;
        activeConfirmation.current = null;
        setConfirmation(null);
      });

      pending.current = promise;

      return promise;
    },
    [client],
  );

  const runWithFreshAuth = useCallback<RunWithFreshAuth>(
    async (operation) => {
      const userId = client.$store.atoms.session.get().data?.user.id;

      if (!userId) {
        throw new ApiError(401, 'Authentication required');
      }

      try {
        return await operation();
      } catch (error) {
        if (
          !(error instanceof ApiError || error instanceof UnlockApiError) ||
          error.code !== 'FRESH_AUTHENTICATION_REQUIRED'
        ) {
          throw error;
        }
      }

      await requestConfirmation(userId);

      if (client.$store.atoms.session.get().data?.user.id !== userId) {
        throw new ApiError(401, 'Authentication identity changed');
      }

      return operation();
    },
    [client, requestConfirmation],
  );

  return (
    <FreshAuthContext.Provider value={runWithFreshAuth}>
      {children}
      {confirmation ? (
        <ReauthenticationDialog
          key={confirmation.userId}
          email={confirmation.email}
          userId={confirmation.userId}
          onCancel={cancel}
          onConfirmed={confirmation.resolve}
        />
      ) : null}
    </FreshAuthContext.Provider>
  );
}

export function useFreshAuthentication(): RunWithFreshAuth {
  const run = useContext(FreshAuthContext);

  if (!run) {
    throw new Error('useFreshAuthentication must be used within AuthProvider');
  }

  return run;
}

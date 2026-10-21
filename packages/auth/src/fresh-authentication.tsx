import { type FreshAuthenticationHandler, UnlockApiError } from '@comitium/crypto';
import { ApiError } from '@comitium/schemas/api-errors';
import { createContext, type ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';

import { useAuthClient } from './auth-context';
import { getSessionUser, hasFreshAuthentication } from './fresh-auth-session';
import { ReauthenticationDialog } from './reauthentication-dialog';

type RunWithFreshAuth = <T>(operation: () => Promise<T>) => Promise<T>;

interface Confirmation {
  userId: string;
  email: string;
  promise: Promise<void>;
  resolve: () => void;
  reject: (error: Error) => void;
}

const FreshAuthContext = createContext<{
  run: RunWithFreshAuth;
  confirm: FreshAuthenticationHandler;
} | null>(null);

export function FreshAuthentication({ children }: { children: ReactNode }) {
  const client = useAuthClient();
  const { data } = client.useSession();
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const activeConfirmation = useRef<Confirmation | null>(null);

  const cancel = useCallback(() => {
    activeConfirmation.current?.reject(new DOMException('Sign-in confirmation cancelled', 'AbortError'));
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
      activeConfirmation.current?.reject(new DOMException('Sign-in confirmation cancelled', 'AbortError'));
      activeConfirmation.current = null;
    },
    [],
  );

  const requestConfirmation = useCallback(
    (userId: string) => {
      const user = getSessionUser(client);

      if (!user || user.id !== userId) {
        return Promise.reject(new ApiError(401, 'Authentication identity changed'));
      }

      if (activeConfirmation.current) {
        return activeConfirmation.current.promise;
      }

      let resolve!: () => void;
      let reject!: (error: Error) => void;

      const promise = new Promise<void>((done, fail) => {
        resolve = done;
        reject = fail;
      });

      const request: Confirmation = {
        userId: user.id,
        email: user.email,
        resolve,
        reject,
        promise: promise.finally(() => {
          if (activeConfirmation.current === request) {
            activeConfirmation.current = null;
            setConfirmation(null);
          }
        }),
      };

      activeConfirmation.current = request;
      setConfirmation(request);

      return request.promise;
    },
    [client],
  );

  const runWithFreshAuth = useCallback<RunWithFreshAuth>(
    async (operation) => {
      const userId = getSessionUser(client)?.id;

      if (!userId) {
        throw new ApiError(401, 'Authentication required');
      }

      try {
        return await operation();
      } catch (error) {
        const requiresFreshAuth =
          (error instanceof ApiError || error instanceof UnlockApiError) &&
          error.code === 'FRESH_AUTHENTICATION_REQUIRED';

        if (!requiresFreshAuth) {
          throw error;
        }
      }

      await requestConfirmation(userId);

      if (getSessionUser(client)?.id !== userId) {
        throw new ApiError(401, 'Authentication identity changed');
      }

      return operation();
    },
    [client, requestConfirmation],
  );

  const confirmFreshAuth = useCallback<FreshAuthenticationHandler>(
    async (force = false) => {
      const userId = getSessionUser(client)?.id;

      if (!userId) {
        throw new UnlockApiError(401);
      }

      const fresh = await hasFreshAuthentication(client, userId);

      if (force || !fresh) {
        await requestConfirmation(userId);
      }

      if (getSessionUser(client)?.id !== userId) {
        throw new UnlockApiError(401);
      }
    },
    [client, requestConfirmation],
  );

  return (
    <FreshAuthContext.Provider value={{ run: runWithFreshAuth, confirm: confirmFreshAuth }}>
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
  return useFreshAuthContext().run;
}

export function useConfirmFreshAuthentication(): FreshAuthenticationHandler {
  return useFreshAuthContext().confirm;
}

function useFreshAuthContext() {
  const context = useContext(FreshAuthContext);

  if (!context) {
    throw new Error('useFreshAuthentication must be used within AuthProvider');
  }

  return context;
}

import { CryptoProxy } from '@comitium/crypto';
import { hasEncryptionKeyBundle } from '@comitium/crypto/key-bundle';
import type { User } from '@comitium/schemas/auth';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@comitium/ui/dialog';
import { useQueryClient } from '@tanstack/react-query';
import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { publishSessionEvent, subscribeSessionEvents } from './session-events';
import { StorageAccess } from './storage/storage-access';
import { storageErrorMessage } from './storage/storage-errors';
import { CryptoUnlockContext } from './use-crypto-unlock';
import { useIsCryptoActive } from './use-is-crypto-active';
import { useSession } from './use-session';

interface CryptoProviderProps {
  apiUrl: string;
  sessionQueryKey: readonly unknown[];
  children: ReactNode;
}

interface UnlockPrompt {
  promise: Promise<void>;
  resolve: () => void;
  reject: (error: Error) => void;
}

interface RestoreAttempt {
  identity: string | null;
  task: Promise<boolean>;
}

interface RestoreState {
  identity: string | null;
  pending: boolean;
  error: string | null;
}

export function CryptoProvider({ apiUrl, sessionQueryKey, children }: CryptoProviderProps) {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const active = useIsCryptoActive();
  const canUnlock = hasEncryptionKeyBundle(user);
  const identity = user ? `${user.id}:${user.userKeyVersion ?? 0}` : null;
  const currentIdentity = useRef(identity);
  const attempted = useRef<string | null>(null);
  const restoring = useRef<RestoreAttempt | null>(null);
  const prompt = useRef<UnlockPrompt | null>(null);
  const resettingUserId = useRef<string | null>(null);
  const [promptOpen, setPromptOpen] = useState(false);
  const [restoration, setRestoration] = useState<RestoreState>({
    identity: null,
    pending: false,
    error: null,
  });
  const isCryptoActive = canUnlock && active && CryptoProxy.isActiveFor(user.encryptedUserKey, user.id);

  currentIdentity.current = identity;

  useEffect(() => {
    CryptoProxy.init(apiUrl);

    return () => {
      void CryptoProxy.destroy();
    };
  }, [apiUrl]);

  const tryRestore = useCallback((): Promise<boolean> => {
    if (!hasEncryptionKeyBundle(user)) {
      return Promise.resolve(false);
    }

    if (CryptoProxy.isActiveFor(user.encryptedUserKey, user.id)) {
      return Promise.resolve(true);
    }

    if (restoring.current?.identity === identity) {
      return restoring.current.task;
    }

    if (attempted.current === identity) {
      return Promise.resolve(false);
    }

    attempted.current = identity;
    const task = CryptoProxy.tryUnlockWithRememberedDevice(user.encryptedUserKey, user.id, user.publicKey).finally(
      () => {
        if (restoring.current?.task === task) {
          restoring.current = null;
        }
      },
    );

    restoring.current = { identity, task };
    return task;
  }, [identity, user]);

  useEffect(() => {
    let cancelled = false;

    setRestoration({ identity, pending: canUnlock, error: null });
    void tryRestore().then(
      () => {
        if (!cancelled) {
          setRestoration({ identity, pending: false, error: null });
        }
      },
      (error) => {
        if (!cancelled) {
          setRestoration({ identity, pending: false, error: storageErrorMessage(error) });
        }
      },
    );

    return () => {
      cancelled = true;
    };
  }, [canUnlock, identity, tryRestore]);

  const cancelPrompt = useCallback(() => {
    prompt.current?.reject(new Error('Storage unlock cancelled'));
    prompt.current = null;
    setPromptOpen(false);
  }, []);

  useEffect(() => cancelPrompt, [cancelPrompt, user?.id]);

  const ensureUnlocked = useCallback(async () => {
    const restored = await tryRestore();

    if (!user || currentIdentity.current !== identity) {
      throw new Error('Authentication identity changed');
    }

    if (restored) {
      return;
    }

    if (prompt.current) {
      return prompt.current.promise;
    }

    let resolve!: () => void;
    let reject!: (error: Error) => void;

    const promise = new Promise<void>((done, fail) => {
      resolve = done;
      reject = fail;
    });

    prompt.current = { promise, resolve, reject };
    setPromptOpen(true);

    return promise;
  }, [identity, tryRestore, user]);

  const completePrompt = useCallback(() => {
    prompt.current?.resolve();
    prompt.current = null;
    setPromptOpen(false);
  }, []);

  const changePromptOpen = useCallback(
    (open: boolean) => {
      if (!open) {
        cancelPrompt();
      }
    },
    [cancelPrompt],
  );

  const refreshSession = useCallback(
    async (keysChanged = false) => {
      await queryClient.refetchQueries({ queryKey: sessionQueryKey }, { throwOnError: true });
      const generationChanged = queryClient
        .getQueriesData<User | null>({ queryKey: sessionQueryKey })
        .some(([, latest]) => latest?.id === user?.id && latest?.userKeyVersion !== user?.userKeyVersion);

      if (generationChanged) {
        await queryClient.invalidateQueries();
      }

      if (keysChanged && user) {
        publishSessionEvent('keys-changed', user.id);
      }
    },
    [queryClient, sessionQueryKey, user],
  );

  useEffect(
    () =>
      subscribeSessionEvents((event) => {
        if (event.type === 'logout-complete' && event.userId === resettingUserId.current) {
          window.location.reload();
          return;
        }

        if (event.userId !== user?.id) {
          return;
        }

        if (event.type === 'logout-start') {
          resettingUserId.current = event.userId;
          CryptoProxy.reset();
          cancelPrompt();
          queryClient.clear();
        } else if (event.type === 'logout-complete') {
          window.location.reload();
        } else if (event.type === 'keys-changed') {
          void refreshSession().catch(() => {});
        }
      }),
    [cancelPrompt, queryClient, refreshSession, user?.id],
  );

  return (
    <CryptoUnlockContext.Provider
      value={{
        isCryptoActive,
        canUnlock,
        isRestoring: canUnlock && !isCryptoActive && (restoration.identity !== identity || restoration.pending),
        restoreError: restoration.error,
        ensureUnlocked,
        requestUnlock: ensureUnlocked,
        refreshSession,
      }}
    >
      {children}
      <Dialog open={promptOpen} onOpenChange={changePromptOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogTitle className="sr-only">Open your encrypted data</DialogTitle>
          <DialogDescription className="sr-only">
            Enter or create a password to open your encrypted data.
          </DialogDescription>
          {promptOpen ? <StorageAccess onSuccess={completePrompt} /> : null}
        </DialogContent>
      </Dialog>
    </CryptoUnlockContext.Provider>
  );
}

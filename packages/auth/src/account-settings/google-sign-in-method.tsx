import { Button } from '@comitium/ui/button';
import { ConfirmDialog } from '@comitium/ui/confirm-dialog';
import { GoogleIcon } from '@comitium/ui/google';
import { Spinner } from '@comitium/ui/spinner';
import { useLinkAccount, useUnlinkOAuth } from '@privy-io/react-auth';
import { useCallback, useState } from 'react';

import { canUnlinkGoogle, type LinkedSignInMethods } from '../linked-sign-in-methods';
import { getAccountMethodError } from './account-method-error';
import { SignInMethodRow } from './sign-in-method-row';
import type { RefreshUser } from './types';

interface GoogleSignInMethodProps {
  methods: LinkedSignInMethods;
  refreshUser: RefreshUser;
}

export function GoogleSignInMethod({ methods, refreshUser }: GoogleSignInMethodProps) {
  const [linkError, setLinkError] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [isLinking, setIsLinking] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const { unlink } = useUnlinkOAuth();

  const { linkGoogle } = useLinkAccount({
    onSuccess: ({ linkMethod }) => {
      if (linkMethod !== 'google') {
        return;
      }

      setLinkError(null);
      setIsLinking(false);
      void refreshUser().catch(() => undefined);
    },
    onError: (linkError, { linkMethod }) => {
      if (linkMethod !== 'google') {
        return;
      }

      setLinkError(getAccountMethodError(linkError, 'link-google'));
      setIsLinking(false);
    },
  });

  const googleCanBeRemoved = canUnlinkGoogle(methods);

  const handleLinkGoogle = useCallback(() => {
    if (isLinking) {
      return;
    }

    setLinkError(null);
    setIsLinking(true);

    try {
      linkGoogle();
    } catch (linkError) {
      setLinkError(getAccountMethodError(linkError, 'link-google'));
      setIsLinking(false);
    }
  }, [isLinking, linkGoogle]);

  const handleOpenRemoveDialog = useCallback(() => {
    setRemoveError(null);
    setRemoveDialogOpen(true);
  }, []);

  const handleRemoveGoogle = useCallback(async () => {
    if (!methods.google || !canUnlinkGoogle(methods) || isRemoving) {
      return;
    }

    setRemoveError(null);
    setIsRemoving(true);

    try {
      await unlink({ provider: 'google', subject: methods.google.subject });
      await refreshUser().catch(() => undefined);
      setRemoveDialogOpen(false);
    } catch {
      setRemoveError('We could not remove Google. Try again.');
    } finally {
      setIsRemoving(false);
    }
  }, [isRemoving, methods, refreshUser, unlink]);

  return (
    <>
      <SignInMethodRow
        icon={<GoogleIcon />}
        label="Google"
        value={methods.google?.email ?? 'Not added'}
        note={methods.google && !googleCanBeRemoved ? 'Add an email before removing Google.' : null}
        error={linkError}
        action={
          methods.google ? (
            <Button variant="outline" size="sm" disabled={!googleCanBeRemoved} onClick={handleOpenRemoveDialog}>
              Remove
            </Button>
          ) : (
            <Button variant="outline" size="sm" disabled={isLinking} onClick={handleLinkGoogle}>
              {isLinking && <Spinner data-icon="inline-start" />}
              {isLinking ? 'Adding...' : 'Add Google'}
            </Button>
          )
        }
      />

      <ConfirmDialog
        open={removeDialogOpen}
        onOpenChange={setRemoveDialogOpen}
        title="Remove Google?"
        description="You will no longer be able to sign in to this Comitium account with Google."
        actionLabel="Remove Google"
        pendingLabel="Removing..."
        isPending={isRemoving}
        onConfirm={handleRemoveGoogle}
        extraContent={
          removeError ? (
            <p role="alert" className="text-copy-13 text-destructive-text">
              {removeError}
            </p>
          ) : null
        }
      />
    </>
  );
}

import { Button } from '@comitium/ui/button';
import { ConfirmDialog } from '@comitium/ui/confirm-dialog';
import { GoogleIcon } from '@comitium/ui/google';
import { Spinner } from '@comitium/ui/spinner';
import { useState } from 'react';

import { useAuthClient } from '../auth-context';
import { AuthFormError } from '../auth-form-error';
import { unwrapAuthResult } from '../auth-result';
import { useFreshAuthentication } from '../fresh-authentication';
import { canUnlinkGoogle, type LinkedSignInMethods } from '../linked-sign-in-methods';
import { getAccountMethodError } from './account-method-error';
import { SignInMethodRow } from './sign-in-method-row';
import type { RefreshMethods } from './types';

interface GoogleSignInMethodProps {
  methods: LinkedSignInMethods;
  refreshMethods: RefreshMethods;
}

export function GoogleSignInMethod({ methods, refreshMethods }: GoogleSignInMethodProps) {
  const [linkError, setLinkError] = useState<string | null>(() => {
    const code = new URLSearchParams(window.location.search).get('error');

    return code ? getAccountMethodError(code, 'link-google') : null;
  });
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [isLinking, setIsLinking] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const client = useAuthClient();
  const runWithFreshAuth = useFreshAuthentication();
  const googleCanBeRemoved = canUnlinkGoogle(methods);

  async function handleLinkGoogle() {
    if (isLinking) {
      return;
    }

    setLinkError(null);
    setIsLinking(true);

    try {
      const callbackURL = new URL(window.location.href);

      callbackURL.searchParams.delete('error');
      callbackURL.searchParams.delete('error_description');

      await runWithFreshAuth(async () =>
        unwrapAuthResult(
          await client.linkSocial({
            provider: 'google',
            callbackURL: callbackURL.href,
            errorCallbackURL: callbackURL.href,
          }),
        ),
      );
    } catch (linkError) {
      setLinkError(getAccountMethodError(linkError, 'link-google'));
      setIsLinking(false);
    }
  }

  function handleOpenRemoveDialog() {
    setRemoveError(null);
    setRemoveDialogOpen(true);
  }

  async function handleRemoveGoogle() {
    if (!methods.google || !googleCanBeRemoved || isRemoving) {
      return;
    }

    setRemoveError(null);
    setIsRemoving(true);

    try {
      const accountId = methods.google.accountId;

      await runWithFreshAuth(async () => unwrapAuthResult(await client.unlinkAccount({ accountId })));
      await refreshMethods();
      setRemoveDialogOpen(false);
    } catch {
      setRemoveError('We could not remove Google. Try again.');
    } finally {
      setIsRemoving(false);
    }
  }

  return (
    <>
      <SignInMethodRow
        icon={<GoogleIcon />}
        label="Google"
        value={methods.google ? 'Connected' : 'Not added'}
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
        extraContent={<AuthFormError message={removeError} />}
      />
    </>
  );
}

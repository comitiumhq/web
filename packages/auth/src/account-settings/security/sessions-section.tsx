import { Button } from '@comitium/ui/button';
import { Card, CardContent } from '@comitium/ui/card';
import { ConfirmDialog } from '@comitium/ui/confirm-dialog';
import { useCallback, useState } from 'react';
import { useAccountLogout } from '../../use-logout';

interface SessionsSectionProps {
  hasUserKey: boolean;
}

export function SessionsSection({ hasUserKey }: SessionsSectionProps) {
  const logout = useAccountLogout('/login');
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const openLogout = useCallback(() => setConfirmLogout(true), []);

  const signOutEverywhere = useCallback(async () => {
    setLoggingOut(true);
    await logout({ allDevices: true });
    setLoggingOut(false);
  }, [logout]);

  return (
    <>
      <Card size="sm">
        <CardContent className="grid gap-3">
          <h2 className="text-heading-16">Sessions</h2>
          <p className="text-copy-14 text-muted-foreground">
            {hasUserKey
              ? 'Your next sign-in will need your password or recovery code to open your encrypted data.'
              : 'Sign out of Comitium on all devices.'}
          </p>
          <Button variant="outline" className="w-fit" onClick={openLogout}>
            Sign out on all devices
          </Button>
        </CardContent>
      </Card>
      <ConfirmDialog
        open={confirmLogout}
        onOpenChange={setConfirmLogout}
        title="Sign out on all devices?"
        description="All Comitium sessions and remembered-device keys will be revoked, including this device."
        actionLabel="Sign out everywhere"
        onConfirm={signOutEverywhere}
        isPending={loggingOut}
      />
    </>
  );
}

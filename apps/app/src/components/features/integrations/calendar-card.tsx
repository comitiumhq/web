import { Badge } from '@comitium/ui/badge';
import { Button } from '@comitium/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@comitium/ui/card';
import { ConfirmDialog } from '@comitium/ui/confirm-dialog';
import { GoogleIcon } from '@comitium/ui/google';
import { Skeleton } from '@comitium/ui/skeleton';
import { Spinner } from '@comitium/ui/spinner';
import { CheckCircleIcon } from '@phosphor-icons/react';
import { useCallback, useEffect, useState } from 'react';
import { useDisconnectCalendar } from '@/hooks/mutations/use-disconnect-calendar';
import { useFinalizeCalendarConnect } from '@/hooks/mutations/use-finalize-calendar-connect';
import { useQueryCalendarStatus } from '@/hooks/queries/use-query-interviews';
import { useConnectCalendar } from '@/hooks/use-connect-calendar';

const OAUTH_CALLBACK_FLAG = 'connected';

function consumeOAuthCallbackFlag(): boolean {
  const params = new URLSearchParams(window.location.search);

  if (params.get(OAUTH_CALLBACK_FLAG) !== '1') {
    return false;
  }

  params.delete(OAUTH_CALLBACK_FLAG);
  const next = `${window.location.pathname}${params.toString() ? `?${params}` : ''}${window.location.hash}`;
  window.history.replaceState({}, '', next);

  return true;
}

interface CalendarCardProps {
  orgId: string;
}

export function CalendarCard({ orgId }: CalendarCardProps) {
  const { data: calStatus, isLoading } = useQueryCalendarStatus(orgId);
  const { connect, isConnecting } = useConnectCalendar(orgId);
  const disconnect = useDisconnectCalendar(orgId);
  const finalize = useFinalizeCalendarConnect(orgId);

  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    if (consumeOAuthCallbackFlag()) {
      finalize.mutate();
    }
  }, [finalize.mutate]);

  const handleDisconnectClick = useCallback(() => {
    setConfirmOpen(true);
  }, []);

  const handleConfirmDisconnect = useCallback(() => {
    disconnect.mutate(undefined, {
      onSuccess: () => setConfirmOpen(false),
    });
  }, [disconnect]);

  if (isLoading) {
    return (
      <Card className="ring-inset">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Skeleton className="size-8 shrink-0 rounded-lg" />
            <div className="flex flex-col gap-1.5">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-52" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-9 w-24 rounded-4xl" />
        </CardContent>
      </Card>
    );
  }

  const isConnected = calStatus?.calendarConnected === true;

  return (
    <>
      <Card className="ring-inset">
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <GoogleIcon className="size-8 shrink-0" />
              <div>
                <CardTitle className="text-heading-16">Google Calendar</CardTitle>
                <CardDescription className="mt-0.5">
                  {isConnected && calStatus.calendarAccountEmail
                    ? `Connected as ${calStatus.calendarAccountEmail}`
                    : 'Sync interview events with your calendar.'}
                </CardDescription>
              </div>
            </div>
            {isConnected && (
              <Badge variant="success">
                <CheckCircleIcon data-icon="inline-start" />
                Connected
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent>
          {isConnected ? (
            <Button variant="outline" onClick={handleDisconnectClick}>
              Disconnect
            </Button>
          ) : (
            <Button onClick={connect} disabled={isConnecting}>
              {isConnecting && <Spinner data-icon="inline-start" />}
              {isConnecting ? 'Connecting...' : 'Connect'}
            </Button>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Disconnect Google Calendar?"
        description="Existing scheduled interviews will keep their Google Calendar events. New interviews you schedule won't be added to your calendar until you reconnect."
        actionLabel="Disconnect"
        pendingLabel="Disconnecting..."
        isPending={disconnect.isPending}
        onConfirm={handleConfirmDisconnect}
      />
    </>
  );
}

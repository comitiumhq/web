import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { z } from 'zod';

import { getCalToken } from '@/lib/api/interviews';

const CONNECT_TIMEOUT_MS = 15_000;

const connectAuthUrlSchema = z.object({
  data: z.object({ authUrl: z.url() }),
});

function connectErrorMessage(err: unknown, aborted: boolean): string {
  if (aborted) {
    return 'Calendar service did not respond — please try again';
  }

  if (err instanceof Error) {
    return err.message;
  }

  return 'Failed to start calendar connection';
}

// Initiates Google Calendar OAuth via cal. Hard-redirects to Google; receiving page mounts fresh.
export function useConnectCalendar(orgId: string) {
  const [isConnecting, setIsConnecting] = useState(false);

  const connect = useCallback(async () => {
    setIsConnecting(true);

    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), CONNECT_TIMEOUT_MS);

    try {
      const token = await getCalToken(orgId);

      const redir = new URL(window.location.href);

      redir.searchParams.set('connected', '1');

      const url = `${token.calApiUrl}/calendars/google/connect?redir=${encodeURIComponent(redir.toString())}`;

      const res = await fetch(url, {
        signal: ac.signal,
        headers: {
          Authorization: `Bearer ${token.accessToken}`,
          'cal-api-version': token.calApiVersion,
        },
      });

      if (!res.ok) {
        throw new Error(`Calendar service returned ${res.status}`);
      }

      const body = connectAuthUrlSchema.parse(await res.json());

      window.location.href = body.data.authUrl;
    } catch (err) {
      toast.error(connectErrorMessage(err, ac.signal.aborted));
      setIsConnecting(false);
    } finally {
      clearTimeout(timer);
    }
  }, [orgId]);

  return { connect, isConnecting };
}

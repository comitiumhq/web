import { useEffect, useState } from 'react';

const MAX_TIMEOUT_DELAY_MS = 2_147_483_647;

export function useInterviewClock(scheduledAt: string | null, durationMinutes: number, enabled: boolean) {
  const [now, setNow] = useState(Date.now);

  useEffect(() => {
    if (!enabled || !scheduledAt) {
      return;
    }

    const start = new Date(scheduledAt).getTime();
    const end = start + durationMinutes * 60_000;
    let timeout: ReturnType<typeof setTimeout> | undefined;

    function updateClock() {
      clearTimeout(timeout);

      const current = Date.now();
      setNow(current);

      const nextDeadline = [start, end].find((deadline) => deadline > current);

      if (nextDeadline !== undefined) {
        timeout = setTimeout(updateClock, Math.min(nextDeadline - current, MAX_TIMEOUT_DELAY_MS));
      }
    }

    function handleVisibilityChange() {
      if (!document.hidden) {
        updateClock();
      }
    }

    updateClock();
    window.addEventListener('focus', updateClock);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearTimeout(timeout);
      window.removeEventListener('focus', updateClock);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [scheduledAt, durationMinutes, enabled]);

  return now;
}

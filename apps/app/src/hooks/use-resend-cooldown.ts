import { useCallback, useEffect, useRef, useState } from 'react';

const COOLDOWN_SECONDS = 60;

export function useResendCooldown() {
  const [remaining, setRemaining] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined);

  const start = useCallback(() => {
    setRemaining(COOLDOWN_SECONDS);
  }, []);

  const reset = useCallback(() => {
    setRemaining(0);

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  }, []);

  useEffect(() => {
    if (remaining <= 0) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }

      return;
    }

    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);

          return 0;
        }

        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(intervalRef.current);
  }, [remaining]);

  return { remaining, isActive: remaining > 0, start, reset };
}

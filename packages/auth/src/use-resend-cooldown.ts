import { useCallback, useEffect, useState } from 'react';

const COOLDOWN_SECONDS = 60;

export function useResendCooldown() {
  const [remaining, setRemaining] = useState(0);

  const start = useCallback(() => {
    setRemaining(COOLDOWN_SECONDS);
  }, []);

  const reset = useCallback(() => {
    setRemaining(0);
  }, []);

  useEffect(() => {
    if (remaining <= 0) {
      return;
    }

    const interval = setInterval(() => {
      setRemaining((seconds) => Math.max(0, seconds - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [remaining]);

  return { remaining, isActive: remaining > 0, start, reset };
}

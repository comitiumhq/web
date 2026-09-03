import { useEffect, useState } from 'react';

const isBrowser = typeof window !== 'undefined';

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => (isBrowser ? window.matchMedia(query).matches : false));

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    const updateMatch = (event: MediaQueryListEvent) => setMatches(event.matches);

    mediaQuery.addEventListener('change', updateMatch);
    setMatches(mediaQuery.matches);

    return () => mediaQuery.removeEventListener('change', updateMatch);
  }, [query]);

  return matches;
}

import { useEffect, useRef } from 'react';

interface UseInfiniteScrollSentinelParams {
  hasMore: boolean;
  isLoading: boolean;
  onLoadMore: () => void;
  disabled?: boolean;
  rootMargin?: string;
}

export function useInfiniteScrollSentinel({
  hasMore,
  isLoading,
  onLoadMore,
  disabled = false,
  rootMargin = '240px',
}: UseInfiniteScrollSentinelParams) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const target = ref.current;

    if (!target || !hasMore || isLoading || disabled) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          onLoadMore();
        }
      },
      { rootMargin },
    );
    observer.observe(target);

    return () => observer.disconnect();
  }, [disabled, hasMore, isLoading, onLoadMore, rootMargin]);

  return ref;
}

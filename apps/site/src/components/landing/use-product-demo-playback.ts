import { type AnimationSequence, useAnimate, useInView } from 'motion/react';
import { useEffect, useRef } from 'react';
import { usePrefersReducedMotion } from './use-prefers-reduced-motion';

export const DEMO_RESET_TIMING = { fadeOut: 0.3, swap: 0.05, fadeIn: 0.35 } as const;

export function useProductDemoPlayback(
  createSequence: () => AnimationSequence,
  { speed = 1, repeatDelay = 0 }: { speed?: number; repeatDelay?: number } = {},
) {
  const [scope, animate] = useAnimate<HTMLDivElement>();
  const isInView = useInView(scope, { amount: 0.5 });
  const reduceMotion = usePrefersReducedMotion();
  const playbackRef = useRef<ReturnType<typeof animate> | null>(null);

  useEffect(() => {
    if (reduceMotion) return;

    const playback = animate(createSequence(), {
      repeat: Number.POSITIVE_INFINITY,
      repeatDelay,
      defaultTransition: { ease: [0.22, 1, 0.36, 1] },
    });
    playback.pause();
    playback.speed = speed;
    playbackRef.current = playback;

    return () => {
      playback.cancel();
      playbackRef.current = null;
    };
  }, [animate, createSequence, reduceMotion, repeatDelay, speed]);

  useEffect(() => {
    const syncPlayback = () => {
      if (isInView && !reduceMotion && !document.hidden) playbackRef.current?.play();
      else playbackRef.current?.pause();
    };
    syncPlayback();
    document.addEventListener('visibilitychange', syncPlayback);
    return () => document.removeEventListener('visibilitychange', syncPlayback);
  }, [animate, createSequence, isInView, reduceMotion, repeatDelay, speed]);

  return { scope, isInView, reduceMotion };
}

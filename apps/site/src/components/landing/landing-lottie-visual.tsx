import type { DotLottie } from '@lottiefiles/dotlottie-react';
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { usePrefersReducedMotion } from './use-prefers-reduced-motion';

const DotLottiePlayer = lazy(async () => {
  const { DotLottieReact } = await import('@lottiefiles/dotlottie-react');
  return { default: DotLottieReact };
});

interface LandingLottieVisualProps {
  src: string;
  poster: string;
}

export function LandingLottieVisual({ src, poster }: LandingLottieVisualProps) {
  const illustrationRef = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(false);
  const [hasEnteredView, setHasEnteredView] = useState(false);
  const reduceMotion = usePrefersReducedMotion();
  const [player, setPlayer] = useState<DotLottie | null>(null);
  const [playerReady, setPlayerReady] = useState(false);

  const handlePlayerRef = useCallback((instance: DotLottie | null) => {
    setPlayer(instance);
    setPlayerReady(instance?.isLoaded ?? false);
  }, []);

  useEffect(() => {
    const illustration = illustrationRef.current;
    if (!illustration) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setHasEnteredView(true);
        setIsInView(entry.intersectionRatio >= 0.3);
      },
      { threshold: 0.3 },
    );

    observer.observe(illustration);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!player) return;

    const syncPlayback = () => {
      setPlayerReady(player.isLoaded);
      if (isInView && !reduceMotion) {
        player.play();
      } else {
        player.pause();
      }
    };

    player.addEventListener('load', syncPlayback);
    syncPlayback();

    return () => player.removeEventListener('load', syncPlayback);
  }, [isInView, player, reduceMotion]);

  return (
    <div ref={illustrationRef} className="relative size-full" aria-hidden="true">
      <img
        src={poster}
        alt=""
        className={`absolute inset-0 h-full w-full object-contain ${playerReady && !reduceMotion ? 'hidden' : ''}`}
      />
      {hasEnteredView && !reduceMotion && (
        <Suspense fallback={null}>
          <DotLottiePlayer
            src={src}
            loop
            dotLottieRefCallback={handlePlayerRef}
            className={`h-full w-full ${playerReady ? '' : 'opacity-0'}`}
          />
        </Suspense>
      )}
    </div>
  );
}

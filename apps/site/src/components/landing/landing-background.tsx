import ColorBends from './color-bends';
import { usePrefersReducedMotion } from './use-prefers-reduced-motion';

const COLOR_BENDS_COLORS = ['var(--primary)'];

export function LandingBackground() {
  const reduceMotion = usePrefersReducedMotion();

  return (
    <div
      className="pointer-events-none absolute inset-x-0 top-0 z-0 h-svh overflow-hidden opacity-10 [mask-image:linear-gradient(to_bottom,black_70%,transparent_100%)]"
      aria-hidden="true"
    >
      {!reduceMotion && (
        <ColorBends
          className="pointer-events-auto size-full"
          rotation={90}
          autoRotate={0}
          speed={0.2}
          scale={1}
          frequency={1}
          warpStrength={1}
          mouseInfluence={1}
          parallax={0.5}
          noise={0}
          iterations={1}
          intensity={1}
          bandWidth={6}
          colors={COLOR_BENDS_COLORS}
          transparent
        />
      )}
    </div>
  );
}

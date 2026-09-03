import ColorBends from './color-bends';

const COLOR_BENDS_COLORS = ['var(--primary)'];

export function LandingBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 opacity-15" aria-hidden="true">
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
    </div>
  );
}

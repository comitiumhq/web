import { Button } from '@comitium/ui/button';
import { cn } from '@comitium/ui/cn';
import type { AnimationSequence } from 'motion/react';
import { LandingSurfaceLight } from './landing-surface-light';
import { useProductDemoPlayback } from './use-product-demo-playback';

const ORBIT_SERVICES = [
  { id: 'google-calendar', image: '/images/google-calendar.svg' },
  { id: 'slack', image: '/images/slack-mark.svg' },
  { id: 'zoom', image: '/images/zoom.svg' },
  { id: 'outlook', image: '/images/outlook.svg' },
  { id: 'microsoft-teams', image: '/images/microsoft-teams.svg' },
  { id: 'google-meet', image: '/images/google-meet.webp' },
];

function createOrbitSequence(): AnimationSequence {
  return [
    ['.landing-cta-orbit-track', { rotate: [0, 360] }, { duration: 48, ease: 'linear' }],
    ['.landing-cta-orbit-icon', { rotate: [0, -360] }, { at: 0, duration: 48, ease: 'linear' }],
  ];
}

function IntegrationOrbit() {
  const { scope } = useProductDemoPlayback(createOrbitSequence);

  return (
    <div
      ref={scope}
      className="relative isolate mx-auto aspect-square w-full max-w-[28rem] overflow-hidden rounded-[1.75rem]"
      aria-hidden="true"
    >
      <LandingSurfaceLight />
      <svg viewBox="0 0 400 400" className="absolute inset-0 size-full text-primary/20" fill="none">
        <circle cx="200" cy="200" r="152" stroke="currentColor" strokeWidth="1" strokeDasharray="3 5" />
      </svg>
      <div className="landing-cta-orbit-track absolute inset-[12%]">
        {ORBIT_SERVICES.map(({ id, image }, index) => {
          const angle = -Math.PI / 2 + (index * Math.PI * 2) / ORBIT_SERVICES.length;

          return (
            <div
              key={id}
              className="absolute size-[18%] -translate-1/2"
              style={{ left: `${50 + Math.cos(angle) * 50}%`, top: `${50 + Math.sin(angle) * 50}%` }}
            >
              <div className="landing-cta-orbit-icon grid size-full place-items-center rounded-[28%] border border-white bg-white/95 shadow-[0_4px_14px_-4px_rgba(47,74,117,0.18),inset_0_0_0_1px_rgba(47,74,117,0.04)]">
                <img
                  src={image}
                  alt=""
                  width="42"
                  height="42"
                  loading="lazy"
                  className={cn(
                    'size-[68%] object-contain',
                    // Meet's bitmap has 28px of transparent padding on each side in its 256px canvas.
                    id === 'google-meet' && 'size-[87%]',
                  )}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function LandingCtaSection({ onRequestEarlyAccess }: { onRequestEarlyAccess: () => void }) {
  return (
    <section
      aria-labelledby="landing-cta-heading"
      className="mt-24 grid gap-10 overflow-hidden rounded-[2rem] border border-border bg-card p-7 sm:mt-32 sm:p-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-center lg:gap-14 lg:p-14 xl:p-16"
    >
      <div className="min-w-0">
        <h2
          id="landing-cta-heading"
          className="text-[clamp(2.25rem,4.3vw,3.75rem)] leading-[1.08] font-medium tracking-[-0.05em] text-balance"
        >
          <span className="block">Make room for</span>
          <span className="block">better hiring.</span>
        </h2>
        <p className="mt-6 max-w-[29rem] text-base leading-7 text-[color:var(--landing-text-context)] sm:text-lg sm:leading-8">
          Bring interviews, feedback, and conversations together. Keep your team aligned and sensitive details private.
        </p>
        <div className="mt-8">
          <Button size="lg" className="h-11 px-5" onClick={onRequestEarlyAccess}>
            Request early access
          </Button>
        </div>
      </div>
      <IntegrationOrbit />
    </section>
  );
}

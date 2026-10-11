import { useEffect, useRef } from 'react';

export type LandingSurfaceTone = 'hero' | 'workflow' | 'neutral' | 'identity' | 'encryption';

export function LandingSurfaceLight({
  animated = false,
  tone = 'hero',
}: {
  animated?: boolean;
  tone?: LandingSurfaceTone;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const surface = ref.current;
    if (!animated || !surface) return;

    let inView = false;
    const syncPlayback = () => {
      surface.dataset.paused = String(!inView || document.hidden);
    };
    const observer = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      syncPlayback();
    });
    syncPlayback();
    observer.observe(surface);
    document.addEventListener('visibilitychange', syncPlayback);
    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', syncPlayback);
    };
  }, [animated]);

  return (
    <div
      ref={ref}
      className="landing-surface-light pointer-events-none absolute inset-0 overflow-hidden bg-[#eef3fb] data-[tone=workflow]:bg-[#f6f8fc] data-[tone=neutral]:bg-[#f8fafc] data-[tone=identity]:bg-[#f6f9fc] data-[tone=encryption]:bg-[#f5f8fc] [contain:paint]"
      data-tone={tone}
      data-animated={animated || undefined}
      data-paused={animated || undefined}
      aria-hidden="true"
    >
      <div className="landing-surface-blue absolute -inset-y-[18%] -inset-x-[12%]" />
      <div className="landing-surface-ice absolute -inset-y-[18%] -inset-x-[12%]" />
      <div className="landing-surface-finish absolute inset-0" />
    </div>
  );
}

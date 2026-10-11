import { Button } from '@comitium/ui/button';
import { cn } from '@comitium/ui/cn';
import { PageContainer } from '@comitium/ui/page-container';
import { ArrowRightIcon } from '@phosphor-icons/react';
import { createFileRoute } from '@tanstack/react-router';
import { HeroProductPreview } from '@/components/landing/hero-product-preview';
import { LandingBackground } from '@/components/landing/landing-background';
import { LandingFeaturesSection } from '@/components/landing/landing-features-section';
import { LANDING_CONTAINER_CLASS_NAME } from '@/components/landing/landing-layout';
import { buildSeoHead } from '@/lib/seo/public';

const EARLY_ACCESS_URL = 'mailto:illia.yablonski@comitium.co?subject=Comitium%20early%20access';

export const Route = createFileRoute('/')({
  head: () =>
    buildSeoHead({
      title: 'Comitium | Hiring is personal. Keep it that way.',
      description: 'An ATS built for people on both sides.',
      path: '/',
    }),
  component: LandingPage,
});

function LandingPage() {
  return (
    <div className="relative isolate text-foreground">
      <section className="relative z-10 flex">
        <LandingBackground />
        <PageContainer
          className={cn(
            LANDING_CONTAINER_CLASS_NAME,
            'pointer-events-none relative z-10 flex flex-1 flex-col items-center pt-28 pb-12 text-center sm:pt-32 sm:pb-16',
          )}
        >
          <div className="pointer-events-auto flex w-full max-w-4xl flex-col items-center">
            <h1 className="text-4xl leading-[1.04] font-medium tracking-[-0.055em] min-[360px]:text-[clamp(2.75rem,5.5vw,4.5rem)]">
              <span className="block">Hiring is personal.</span>
              <span className="block">Keep it that way.</span>
            </h1>

            <p className="mt-6 max-w-[34rem] text-base leading-7 text-muted-foreground text-balance sm:text-lg">
              An ATS built for people on both sides.
            </p>

            <Button asChild size="lg" className="mt-7 h-11 px-5">
              <a href={EARLY_ACCESS_URL}>
                Request early access
                <ArrowRightIcon data-icon="inline-end" />
              </a>
            </Button>
          </div>
          <HeroProductPreview />
        </PageContainer>
      </section>
      <LandingFeaturesSection earlyAccessUrl={EARLY_ACCESS_URL} />
    </div>
  );
}

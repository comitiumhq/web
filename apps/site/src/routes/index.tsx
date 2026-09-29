import { Button } from '@comitium/ui/button';
import { PageContainer } from '@comitium/ui/page-container';
import { ArrowRightIcon } from '@phosphor-icons/react';
import { createFileRoute } from '@tanstack/react-router';
import { LandingBackground } from '@/components/landing/landing-background';
import { LandingFeaturesSection } from '@/components/landing/landing-features-section';
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
      <section className="relative z-10 flex min-h-[70svh] xl:min-h-[65svh]">
        <LandingBackground />
        <PageContainer className="pointer-events-none relative z-10 flex flex-1 flex-col items-center justify-center px-5 py-16 text-center sm:px-8 sm:py-20 xl:py-14">
          <div className="pointer-events-auto flex w-full max-w-4xl flex-col items-center">
            <span className="landing-glass inline-flex h-8 items-center rounded-full px-4 text-sm text-muted-foreground">
              Early Access
            </span>

            <h1 className="mt-7 max-w-4xl text-[clamp(2.75rem,5vw,4rem)] leading-[0.98] font-medium tracking-[-0.055em] text-balance">
              Hiring is personal. Keep it that way.
            </h1>

            <p className="mt-5 max-w-[19rem] text-base leading-7 text-muted-foreground text-balance sm:max-w-2xl sm:text-lg">
              An ATS built for people on both sides.
            </p>

            <Button asChild size="lg" className="mt-9 h-11 px-5">
              <a href={EARLY_ACCESS_URL}>
                Request early access
                <ArrowRightIcon data-icon="inline-end" />
              </a>
            </Button>
          </div>
        </PageContainer>
      </section>
      <LandingFeaturesSection earlyAccessUrl={EARLY_ACCESS_URL} />
    </div>
  );
}

import { Button } from '@comitium/ui/button';
import { cn } from '@comitium/ui/cn';
import { PageContainer } from '@comitium/ui/page-container';
import { ArrowRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { AiOrbVisual } from './ai-orb-visual';
import { AtsProductVisual } from './ats-product-visual';
import { EncryptionProductVisual } from './encryption-product-visual';
import { IdentityProductVisual } from './identity-product-visual';
import { LandingFaqSection } from './landing-faq-section';
import { LANDING_CONTAINER_CLASS_NAME, LANDING_TEXT_TONES_CLASS_NAME } from './landing-layout';
import { LandingSurfaceLight, type LandingSurfaceTone } from './landing-surface-light';
import { SchedulingProductVisual } from './scheduling-product-visual';

interface MomentProps {
  title: string;
  description: string;
  children: ReactNode;
  surfaceTone: LandingSurfaceTone;
  className?: string;
  visualClassName?: string;
}

function Moment({ title, description, children, surfaceTone, className = '', visualClassName = '' }: MomentProps) {
  return (
    <article
      className={cn(
        'landing-feature-card group/feature relative isolate flex min-w-0 flex-col overflow-hidden rounded-[2rem] md:h-[30rem]',
        className,
      )}
    >
      <LandingSurfaceLight tone={surfaceTone} />
      <div
        className={cn(
          'landing-feature-visual relative min-h-0 h-[clamp(15rem,70vw,24rem)] flex-none [&>div]:z-1 md:h-auto md:flex-1',
          'md:max-xl:group-[.landing-feature-card-ai]/feature:w-1/2 md:max-xl:group-[.landing-feature-card-ai]/feature:flex-none',
          visualClassName,
        )}
      >
        {children}
      </div>
      <div
        className={cn(
          'landing-feature-content relative z-10 px-6 pt-2 pb-7 sm:px-8 sm:pb-8 md:flex-none md:min-h-[10rem]',
          'md:max-[60rem]:group-[.landing-feature-card-support]/feature:min-h-[12rem]',
          'xl:group-[.landing-feature-card-support]/feature:min-h-[11.5rem]',
          'min-[90rem]:group-[.landing-feature-card-main]/feature:min-h-[8rem]',
          'min-[90rem]:group-[.landing-feature-card-support]/feature:min-h-[9rem]',
          'md:max-xl:group-[.landing-feature-card-ai]/feature:flex md:max-xl:group-[.landing-feature-card-ai]/feature:w-1/2',
          'md:max-xl:group-[.landing-feature-card-ai]/feature:min-h-0 md:max-xl:group-[.landing-feature-card-ai]/feature:flex-col',
          'md:max-xl:group-[.landing-feature-card-ai]/feature:justify-center md:max-xl:group-[.landing-feature-card-ai]/feature:py-8',
        )}
      >
        <h3 className="text-[1.35rem] leading-[1.2] font-medium tracking-[-0.035em] text-foreground text-balance sm:text-[1.5rem]">
          {title}
        </h3>
        <p className="mt-2 max-w-[38rem] text-[0.9375rem] leading-6 text-[color:var(--landing-text-context)] sm:text-base">
          {description}
        </p>
      </div>
    </article>
  );
}

export function LandingFeaturesSection({ earlyAccessUrl }: { earlyAccessUrl: string }) {
  return (
    <div className={cn('landing-features relative z-10', LANDING_TEXT_TONES_CLASS_NAME)}>
      <section className="pt-16 pb-24 sm:pt-20 sm:pb-32" aria-labelledby="landing-features-heading">
        <PageContainer className={cn(LANDING_CONTAINER_CLASS_NAME, 'relative')}>
          <h2
            id="landing-features-heading"
            className="mb-9 text-2xl leading-[1.12] font-medium tracking-[-0.04em] sm:mb-12 sm:text-3xl lg:text-[2.75rem]"
          >
            <span className="block lg:inline">Less busywork.</span>{' '}
            <span className="block lg:inline">More time for people.</span>
          </h2>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-12 xl:gap-6">
            <Moment
              title="ATS for structured hiring"
              surfaceTone="workflow"
              description="Plan interviews, collect feedback, and make decisions as a team."
              className="landing-feature-card-main xl:col-span-7 xl:h-[clamp(28rem,34vw,30rem)]"
              visualClassName="landing-feature-visual-ats-product max-md:h-[clamp(20rem,70vw,24rem)]"
            >
              <AtsProductVisual />
            </Moment>

            <Moment
              title="Scheduling Automation"
              surfaceTone="workflow"
              description="Turn your team’s availability into confirmed interviews. Candidates choose a time; invitations go out automatically."
              className="landing-feature-card-main xl:col-span-5 xl:h-[clamp(28rem,34vw,30rem)]"
              visualClassName="landing-feature-visual-scheduling-product max-md:h-[clamp(20rem,70vw,24rem)]"
            >
              <SchedulingProductVisual />
            </Moment>

            <Moment
              title="AI for the work around hiring"
              surfaceTone="neutral"
              description="AI organizes information and handles routine tasks. Your team decides."
              className="landing-feature-card-support landing-feature-card-ai md:col-span-2 md:max-xl:h-[24rem] md:max-xl:flex-row-reverse xl:col-span-4"
              visualClassName="landing-feature-visual-ai"
            >
              <AiOrbVisual />
            </Moment>
            <Moment
              title="A person behind the application"
              surfaceTone="identity"
              description="Zero Knowledge Identity helps verify real people while keeping sensitive details protected."
              className="landing-feature-card-support md:max-[60rem]:h-[32rem] xl:col-span-4"
              visualClassName="landing-feature-visual-identity-product max-md:h-[clamp(20rem,76vw,26rem)]"
            >
              <IdentityProductVisual />
            </Moment>

            <Moment
              title="Protect data at every step"
              surfaceTone="encryption"
              description="From application to offer, sensitive content is protected with end-to-end encryption."
              className="landing-feature-card-support md:max-[60rem]:h-[32rem] xl:col-span-4"
              visualClassName="landing-feature-visual-encryption max-md:h-[clamp(20rem,76vw,26rem)]"
            >
              <EncryptionProductVisual />
            </Moment>
          </div>
          <LandingFaqSection />
          <div className="mt-20 flex justify-center sm:mt-24">
            <Button asChild size="lg" className="h-11 px-5">
              <a href={earlyAccessUrl}>
                Request early access
                <ArrowRight aria-hidden data-icon="inline-end" />
              </a>
            </Button>
          </div>
        </PageContainer>
      </section>
    </div>
  );
}

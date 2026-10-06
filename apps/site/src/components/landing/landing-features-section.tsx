import { Button } from '@comitium/ui/button';
import { PageContainer } from '@comitium/ui/page-container';
import { ArrowRightIcon } from '@phosphor-icons/react';
import type { ReactNode } from 'react';
import { LandingLottieVisual } from './landing-lottie-visual';

interface MomentProps {
  title: string;
  description: string;
  children: ReactNode;
  className?: string;
  visualClassName?: string;
  contentClassName?: string;
  visualFirst?: boolean;
}

function Moment({
  title,
  description,
  children,
  className = '',
  visualClassName = '',
  contentClassName = '',
  visualFirst = false,
}: MomentProps) {
  const visual = <div className={`relative min-h-0 aspect-[18/13] overflow-hidden ${visualClassName}`}>{children}</div>;
  const content = (
    <div className={`relative z-10 px-6 py-6 sm:px-7 sm:py-7 ${contentClassName}`}>
      <h3 className="text-[1.35rem] leading-[1.15] font-medium tracking-[-0.04em] text-foreground text-balance sm:text-[1.5rem]">
        {title}
      </h3>
      <p className="mt-2 max-w-[34rem] text-[0.9375rem] leading-6 text-muted-foreground">{description}</p>
    </div>
  );

  return (
    <article
      className={`flex min-w-0 flex-col overflow-hidden rounded-[1.75rem] bg-kanban-canvas shadow-[0_1px_4px_rgba(0,0,0,0.03),0_8px_24px_rgba(0,0,0,0.018)] ${className}`}
    >
      {visualFirst ? visual : content}
      {visualFirst ? content : visual}
    </article>
  );
}

export function LandingFeaturesSection({ earlyAccessUrl }: { earlyAccessUrl: string }) {
  return (
    <div className="relative z-10">
      <section className="pt-10 pb-5 sm:pt-12" aria-label="Hiring with Comitium">
        <PageContainer className="max-w-7xl px-5 sm:px-8">
          <h2 className="sr-only">Hiring tools</h2>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:h-[min(41.25rem,calc(100svh-9rem))] xl:min-h-[35rem] xl:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] xl:grid-rows-[repeat(2,minmax(0,1fr))]">
            <Moment
              title="ATS for structured hiring"
              description="Plan interviews, collect feedback, and make decisions as a team."
              className="xl:row-span-2 xl:min-h-0"
              visualClassName="xl:mt-auto xl:flex-1 xl:aspect-auto"
              contentClassName="pb-2 xl:px-9 xl:pt-9"
            >
              <LandingLottieVisual src="/animations/ats.json" poster="/animations/ats-poster.png" />
            </Moment>

            <Moment
              title="Scheduling Automation"
              description="Turn your team’s availability into confirmed interviews. Candidates choose a time; invitations go out automatically."
              className="xl:min-h-0"
              visualClassName="xl:flex-1 xl:aspect-auto xl:[&>div]:scale-[1.05]"
              contentClassName="pt-2 sm:pt-2 xl:pb-3"
              visualFirst
            >
              <LandingLottieVisual src="/animations/scheduling.json" poster="/animations/scheduling-poster.png" />
            </Moment>

            <Moment
              title="AI for the work around hiring"
              description="AI helps organize information and move routine tasks forward. Your team reviews the context and makes decisions."
              className="md:col-span-2 md:min-h-[15rem] md:flex-row xl:col-span-1 xl:min-h-0 xl:flex-col"
              visualClassName="md:w-1/2 md:flex-none md:aspect-auto md:[&>div]:scale-[1.05] xl:w-full xl:flex-1"
              contentClassName="md:flex md:w-1/2 md:flex-col md:justify-center xl:block xl:w-full xl:pt-7 xl:pb-0"
            >
              <LandingLottieVisual src="/animations/ai-legwork.json" poster="/animations/ai-legwork-poster.png" />
            </Moment>
          </div>
        </PageContainer>
      </section>

      <section className="pb-24 sm:pb-32" aria-label="Identity and data protection">
        <PageContainer className="max-w-7xl px-5 sm:px-8">
          <h2 className="sr-only">Identity and data protection</h2>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <Moment
              title="A person behind the application"
              description="Zero Knowledge Identity helps verify real people while keeping sensitive details protected."
              className="md:h-[30rem]"
              visualClassName="md:flex-1 md:aspect-auto md:[&>div]:scale-[1.15]"
              contentClassName="pb-2 sm:pb-2"
            >
              <LandingLottieVisual
                src="/animations/zk-identity-in-place.json"
                poster="/animations/zk-identity-in-place-poster.png"
              />
            </Moment>

            <Moment
              title="Protect data at every step"
              description="From application to offer, sensitive content is protected with end-to-end encryption."
              className="md:h-[30rem]"
              visualClassName="md:flex md:flex-1 md:aspect-auto md:items-center md:justify-center md:[&>div]:aspect-[18/13] md:[&>div]:h-full md:[&>div]:w-auto md:[&>div]:scale-[1.1]"
              contentClassName="pb-2 sm:pb-2"
            >
              <LandingLottieVisual
                src="/animations/encrypted-data-transfer.json"
                poster="/animations/encrypted-data-transfer-poster.png"
              />
            </Moment>
          </div>
          <div className="mt-20 flex justify-center sm:mt-24">
            <Button asChild size="lg" className="h-11 px-5">
              <a href={earlyAccessUrl}>
                Request early access
                <ArrowRightIcon data-icon="inline-end" />
              </a>
            </Button>
          </div>
        </PageContainer>
      </section>
    </div>
  );
}

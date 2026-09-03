import { EXPLORER_TX_URL } from '@comitium/chain/network';
import { Button } from '@comitium/ui/button';
import { Card } from '@comitium/ui/card';
import { CompanyAvatar } from '@comitium/ui/company-avatar';
import { formatRelativeTime } from '@comitium/ui/date';
import { formatEmploymentType, formatLocation, formatLocationType } from '@comitium/ui/formatting';
import { PageContainer } from '@comitium/ui/page-container';
import { formatCompensationSalary, hasCompensation } from '@comitium/ui/salary';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@comitium/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@comitium/ui/tooltip';
import {
  ArrowLeftIcon,
  BriefcaseIcon,
  BuildingsIcon,
  ClockIcon,
  CubeIcon,
  CurrencyDollarIcon,
  MapPinIcon,
} from '@phosphor-icons/react';
import { Link } from '@tanstack/react-router';
import type { ElementType, ReactNode } from 'react';
import { getPublicApplicationAvailability, type PublicApplicationAvailability } from '../../application/availability';
import type { CareerJob } from '../../schemas/careers';
import { JobDescription } from '../job-board/job-detail/description';

type DetailIcon = ElementType<{ className?: string }>;
type CareerJobDetailTab = 'overview' | 'apply';

interface CareerJobDetailPageProps {
  job: CareerJob;
  initialTab?: CareerJobDetailTab;
  applyContent?: ReactNode;
  applyUrl?: string;
}

interface DetailItem {
  icon: DetailIcon;
  label: string;
  value: string | null;
}

function formatResponseDeadline(days: number | null): string | null {
  if (days === null) {
    return null;
  }

  const noun = days === 1 ? 'day' : 'days';

  return `${days} ${noun} to respond`;
}

function renderDetailItem(item: DetailItem) {
  const Icon = item.icon;

  if (!item.value) {
    return null;
  }

  return (
    <div key={item.label} className="flex items-start gap-3 py-3">
      <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
        <Icon className="size-4" />
      </div>
      <div className="min-w-0">
        <dt className="text-label-12 text-muted-foreground">{item.label}</dt>
        <dd className="mt-0.5 text-label-14 text-foreground">{item.value}</dd>
      </div>
    </div>
  );
}

function CareerApplyTab({ availability }: { availability: PublicApplicationAvailability }) {
  if (availability === 'capacity-reached') {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="flex h-full flex-1 cursor-not-allowed" role="presentation">
            <TabsTrigger
              value="apply"
              disabled
              aria-label="Apply unavailable: application limit reached"
              className="w-full"
            >
              Apply
            </TabsTrigger>
          </span>
        </TooltipTrigger>
        <TooltipContent>This job has reached its application limit.</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <TabsTrigger value="apply" disabled={availability !== 'accepting'}>
      Apply
    </TabsTrigger>
  );
}

export function CareerJobDetailPage({
  job,
  initialTab = 'overview',
  applyContent,
  applyUrl,
}: CareerJobDetailPageProps) {
  const companyName = job.org.name ?? job.companyInfo?.name ?? 'Organization';
  const companyLogo = job.org.logo ?? job.companyInfo?.logo ?? null;
  const locationTypeText = formatLocationType(job.locationType);
  const locationText = formatLocation(job.location);
  const salary = hasCompensation(job.compensation) ? formatCompensationSalary(job.compensation) : null;
  const careerPageUrl = `/careers/${job.org.careersSlug}`;
  const applicationAvailability = getPublicApplicationAvailability(job);
  const applyPath = applyUrl ?? `/careers/${job.org.careersSlug}/jobs/${job.postingSlug}/apply`;

  const detailItems: DetailItem[] = [
    { icon: CurrencyDollarIcon, label: 'Compensation', value: salary },
    { icon: BuildingsIcon, label: 'Work model', value: locationTypeText },
    { icon: MapPinIcon, label: 'Location', value: locationText },
    {
      icon: BriefcaseIcon,
      label: 'Employment',
      value: job.employmentType ? formatEmploymentType(job.employmentType) : null,
    },
    {
      icon: ClockIcon,
      label: 'Response target',
      value: formatResponseDeadline(job.responseDeadlineDays),
    },
  ];
  const detailItemNodes = detailItems.map(renderDetailItem);

  return (
    <div className="min-h-full bg-background">
      <PageContainer size="content" className="py-5 lg:py-7">
        <Tabs
          defaultValue={initialTab}
          className="gap-4"
          onValueChange={(value) => {
            if (value === 'apply' && applyContent === undefined) {
              window.location.assign(applyPath);
            }
          }}
        >
          <Link
            to={careerPageUrl}
            className="inline-flex w-fit items-center gap-2 text-label-14 font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeftIcon className="size-4" />
            {companyName} roles
          </Link>

          <Card className="gap-4 p-4 sm:p-5">
            <header>
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  <CompanyAvatar name={companyName} logo={companyLogo} className="size-10" />
                  <div className="min-w-0">
                    <Link
                      to={careerPageUrl}
                      className="block truncate text-label-16 font-medium text-foreground hover:underline"
                    >
                      {companyName}
                    </Link>
                    <div className="mt-1 text-label-13 text-muted-foreground">
                      Posted {formatRelativeTime(job.createdAt)}
                    </div>
                  </div>
                </div>

                {job.txHash && (
                  <Button variant="outline" size="icon" aria-label="View job creation transaction on BaseScan" asChild>
                    <a href={`${EXPLORER_TX_URL}${job.txHash}`} target="_blank" rel="noopener noreferrer">
                      <CubeIcon />
                    </a>
                  </Button>
                )}
              </div>

              <h1 className="mt-4 max-w-3xl text-heading-26 tracking-normal">{job.title || 'Untitled Position'}</h1>
            </header>

            <TabsList className="w-full sm:w-fit">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <CareerApplyTab availability={applicationAvailability} />
            </TabsList>
          </Card>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start">
            <div className="min-w-0">
              <TabsContent value="overview" className="mt-0">
                <Card className="p-5 sm:p-6">
                  {job.description ? (
                    <JobDescription description={job.description} className="text-copy-14" />
                  ) : (
                    <p className="text-copy-14 text-muted-foreground">No description provided.</p>
                  )}
                </Card>
              </TabsContent>

              {applyContent !== undefined && (
                <TabsContent value="apply" className="mt-0">
                  <Card className="p-5 sm:p-6">{applyContent}</Card>
                </TabsContent>
              )}
            </div>

            <aside className="order-first lg:sticky lg:top-6 lg:order-none">
              <Card className="gap-0 overflow-hidden py-0">
                <dl className="divide-y divide-border px-5">{detailItemNodes}</dl>
              </Card>
            </aside>
          </div>
        </Tabs>
      </PageContainer>
    </div>
  );
}

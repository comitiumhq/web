import { PageContainer } from '@comitium/ui/page-container';
import { SectionHeader } from '@comitium/ui/section-header';
import { Skeleton } from '@comitium/ui/skeleton';
import type { ReactNode } from 'react';
import { HiringTeamSkeleton } from '@/components/features/hiring-team-editor/skeleton';
import { InterviewPlanSkeleton } from '@/components/features/job-interview-plan/skeleton';
import { ApplicationFormListSkeleton } from './application-form-picker';
import { type DraftTab, getDraftSection } from './sections';

interface DraftSectionSkeletonProps {
  tab: DraftTab;
}

export function DraftSectionSkeleton({ tab }: DraftSectionSkeletonProps) {
  const section = getDraftSection(tab);

  return (
    <div className="h-full overflow-y-auto">
      <PageContainer size="editor" className="py-8 lg:px-10">
        <SectionHeader title={section.label} description={null} />
        {getSkeletonContent(tab)}
      </PageContainer>
    </div>
  );
}

function getSkeletonContent(tab: DraftTab) {
  switch (tab) {
    case 'details':
      return <DetailsSkeleton />;
    case 'description':
      return <DescriptionSkeleton />;
    case 'application-form':
      return <ApplicationFormListSkeleton />;
    case 'criteria':
      return <CriteriaSkeleton />;
    case 'interview-plan':
      return <InterviewPlanSkeleton />;
    case 'hiring-team':
      return <HiringTeamSkeleton />;
  }
}

function SkeletonSurface({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`rounded-2xl border border-surface-border bg-card bg-clip-padding p-6 ${className}`}
    >
      {children}
    </div>
  );
}

function SkeletonField({ width = 'w-24' }: { width?: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <Skeleton className={`h-3.5 ${width} max-w-full rounded-md`} />
      <Skeleton className="h-9 w-full rounded-xl" />
    </div>
  );
}

function DetailsSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <SkeletonSurface className="flex flex-col gap-5">
        <SkeletonField width="w-12" />
        <div className="grid gap-5 md:grid-cols-2">
          <SkeletonField width="w-16" />
          <SkeletonField width="w-20" />
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          <SkeletonField width="w-20" />
          <SkeletonField width="w-28" />
          <SkeletonField width="w-24" />
        </div>
        <div className="flex flex-col gap-2">
          <Skeleton className="h-3.5 w-28 rounded-md" />
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-9 w-24 rounded-full" />
            <Skeleton className="h-9 w-24 rounded-full" />
            <Skeleton className="h-9 w-20 rounded-full" />
            <Skeleton className="h-9 w-24 rounded-full" />
          </div>
        </div>
      </SkeletonSurface>

      <SkeletonSurface className="flex flex-col gap-5">
        <Skeleton className="h-5 w-32 rounded-md" />
        <div className="flex flex-wrap items-end gap-3">
          <div className="grid min-w-64 flex-1 grid-cols-[1fr_auto_1fr] items-center gap-3">
            <Skeleton className="h-9 rounded-xl" />
            <Skeleton className="h-3.5 w-5 rounded-md" />
            <Skeleton className="h-9 rounded-xl" />
          </div>
          <div className="grid min-w-64 flex-1 grid-cols-2 gap-3">
            <Skeleton className="h-9 rounded-xl" />
            <Skeleton className="h-9 rounded-xl" />
          </div>
        </div>
      </SkeletonSurface>
    </div>
  );
}

function DescriptionSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="overflow-hidden rounded-xl border border-control-border bg-control bg-clip-padding"
    >
      <div className="flex min-h-11 items-center gap-2 border-b border-control-border px-3 py-2">
        <Skeleton className="size-7 rounded-lg" />
        <Skeleton className="size-7 rounded-lg" />
        <Skeleton className="size-7 rounded-lg" />
        <Skeleton className="h-7 w-16 rounded-lg" />
        <Skeleton className="size-7 rounded-lg" />
        <Skeleton className="size-7 rounded-lg" />
      </div>
      <div className="min-h-100 space-y-3 px-5 py-5">
        <Skeleton className="h-4 w-2/3 rounded-md" />
        <Skeleton className="h-4 w-full rounded-md" />
        <Skeleton className="h-4 w-5/6 rounded-md" />
        <Skeleton className="h-4 w-1/2 rounded-md" />
      </div>
    </div>
  );
}

function CriteriaSkeleton() {
  const criteria = [
    { key: 'criterion-1', width: 'w-48' },
    { key: 'criterion-2', width: 'w-40' },
    { key: 'criterion-3', width: 'w-44' },
  ];

  return (
    <div aria-hidden="true" className="flex flex-col gap-3">
      <div className="mb-5 flex flex-col gap-2">
        <Skeleton className="h-3.5 w-full max-w-3xl rounded-md" />
        <Skeleton className="h-3.5 w-2/3 max-w-xl rounded-md" />
      </div>

      {criteria.map((criterion, index) => (
        <div
          key={criterion.key}
          className="flex min-h-14 items-center gap-3 rounded-2xl border border-surface-border bg-card bg-clip-padding px-4 py-3"
        >
          <Skeleton className="size-4 shrink-0 rounded-md" />
          <Skeleton className="size-7 shrink-0 rounded-full" />
          <Skeleton className={`h-4 ${criterion.width} max-w-full rounded-md`} />
          <Skeleton className="ml-auto size-7 shrink-0 rounded-full" />
          <span className="sr-only">Criterion {index + 1}</span>
        </div>
      ))}

      <div className="mt-2 flex items-center gap-3">
        <Skeleton className="h-9 w-32 rounded-full" />
        <Skeleton className="h-4 w-8 rounded-md" />
      </div>
    </div>
  );
}

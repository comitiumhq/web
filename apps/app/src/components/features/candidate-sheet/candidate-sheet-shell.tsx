import { Button } from '@comitium/ui/button';
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetTitle } from '@comitium/ui/sheet';
import { Skeleton } from '@comitium/ui/skeleton';
import { CaretLeftIcon, CaretRightIcon, XIcon } from '@phosphor-icons/react';
import type { ReactNode } from 'react';

const SHEET_CLASS =
  'h-full overflow-visible bg-background p-0 data-[side=right]:w-full data-[side=right]:sm:w-[calc(100vw-5rem)] data-[side=right]:sm:max-w-[1800px]';

interface CandidateSheetPager {
  onPrev: () => void;
  onNext: () => void;
  hasPrev: boolean;
  hasNext: boolean;
}

interface CandidateSheetShellProps {
  open: boolean;
  title: string;
  description: string;
  children: ReactNode;
  pager: CandidateSheetPager;
  onOpenChange: (open: boolean) => void;
}

export function CandidateSheetShell({
  open,
  title,
  description,
  children,
  pager,
  onOpenChange,
}: CandidateSheetShellProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className={SHEET_CLASS} showCloseButton={false}>
        <SheetTitle className="sr-only">{title}</SheetTitle>
        <SheetDescription className="sr-only">{description}</SheetDescription>
        <div className="flex h-full min-w-0 flex-col overflow-hidden">{children}</div>
        <CandidateSheetEdgeControls pager={pager} />
      </SheetContent>
    </Sheet>
  );
}

function CandidateSheetEdgeControls({ pager }: { pager: CandidateSheetPager }) {
  return (
    <>
      <div className="absolute top-3 right-3 z-10 sm:hidden">
        <SheetClose asChild>
          <Button variant="ghost" size="icon-sm" aria-label="Close candidate">
            <XIcon />
          </Button>
        </SheetClose>
      </div>

      <div className="absolute top-5 -left-12 z-10 hidden flex-col gap-3 sm:flex">
        <SheetClose asChild>
          <Button variant="secondary" size="icon-sm" className="shadow-sm" aria-label="Close candidate">
            <XIcon />
          </Button>
        </SheetClose>

        {(pager.hasPrev || pager.hasNext) && (
          <div className="flex flex-col gap-2">
            <Button
              variant="secondary"
              size="icon-sm"
              className="shadow-sm"
              disabled={!pager.hasPrev}
              onClick={pager.onPrev}
              aria-label="Previous candidate"
            >
              <CaretLeftIcon />
            </Button>
            <Button
              variant="secondary"
              size="icon-sm"
              className="shadow-sm"
              disabled={!pager.hasNext}
              onClick={pager.onNext}
              aria-label="Next candidate"
            >
              <CaretRightIcon />
            </Button>
          </div>
        )}
      </div>
    </>
  );
}

export function CandidateSheetSkeleton() {
  return (
    <div
      aria-busy
      className="flex h-full min-w-0 flex-col overflow-hidden bg-background motion-reduce:[&_[data-slot=skeleton]]:animate-none"
    >
      <output className="sr-only">Loading candidate workspace</output>

      <CandidateHeaderSkeleton />

      <div
        aria-hidden
        className="hidden min-h-0 flex-1 grid-cols-[12rem_minmax(0,1.15fr)_minmax(20rem,1fr)] overflow-hidden min-[900px]:grid"
      >
        <ApplicationsSkeleton />
        <ActivitiesSkeleton />
        <CollaborationSkeleton />
      </div>

      <div aria-hidden className="flex min-h-0 flex-1 flex-col overflow-hidden min-[900px]:hidden">
        <div className="shrink-0 border-b border-border px-4 py-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Skeleton className="h-3 w-20 rounded-md" />
            <Skeleton className="h-8 w-full rounded-md sm:max-w-sm" />
          </div>
        </div>

        <div className="shrink-0 overflow-hidden px-4 py-3">
          <div className="flex gap-2">
            <Skeleton className="h-8 w-20 rounded-lg" />
            <Skeleton className="h-8 w-16 rounded-lg" />
            <Skeleton className="h-8 w-16 rounded-lg" />
            <Skeleton className="h-8 w-14 rounded-lg" />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden">
          <ActivitiesContentSkeleton />
        </div>
      </div>
    </div>
  );
}

function CandidateHeaderSkeleton() {
  return (
    <div aria-hidden className="shrink-0 border-b border-border px-6 py-4 pr-14 sm:pr-6">
      <div className="flex flex-col items-stretch gap-3 min-[900px]:flex-row min-[900px]:items-start min-[900px]:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex h-[26px] items-center">
            <Skeleton className="h-5 w-48 max-w-full rounded-md" />
          </div>

          <div className="mt-0.5 flex h-5 items-center">
            <Skeleton className="h-3.5 w-32 rounded-md" />
          </div>

          <div className="mt-2 flex h-5 flex-wrap items-center gap-2">
            <Skeleton className="h-5 w-28 rounded-full" />
          </div>

          <div className="mt-2 flex h-6 items-center gap-1.5">
            <Skeleton className="h-6 w-24 rounded-full" />
            <Skeleton className="h-5 w-28 rounded-full" />
          </div>
        </div>

        <div className="flex flex-wrap gap-2 min-[900px]:justify-end">
          <Skeleton className="h-8 w-32 rounded-lg" />
          <Skeleton className="h-8 w-20 rounded-lg" />
          <Skeleton className="h-8 w-20 rounded-lg" />
          <Skeleton className="size-8 rounded-full" />
        </div>
      </div>
    </div>
  );
}

function ApplicationsSkeleton() {
  return (
    <div className="flex h-full flex-col overflow-hidden border-r border-border">
      <div className="shrink-0 px-3 pb-2 pt-3">
        <Skeleton className="h-3 w-24 rounded-md" />
      </div>

      <div className="px-2 pb-3">
        <div className="rounded-r-lg border-l-2 border-l-primary bg-muted/40 px-3 py-3">
          <Skeleton className="h-4 w-full rounded-md" />
          <Skeleton className="mt-2 h-4 w-4/5 rounded-md" />
          <Skeleton className="mt-3 h-3 w-2/3 rounded-md" />
          <Skeleton className="mt-2 h-3 w-1/2 rounded-md" />
          <Skeleton className="mt-4 h-3 w-14 rounded-md" />
        </div>
      </div>
    </div>
  );
}

function ActivitiesSkeleton() {
  return (
    <div className="relative min-h-0 min-w-0 overflow-hidden">
      <div className="absolute inset-x-0 top-0 z-10 bg-background/80 px-4 py-3 backdrop-blur-md">
        <div className="flex gap-2">
          <Skeleton className="h-8 w-20 rounded-lg" />
          <Skeleton className="h-8 w-16 rounded-lg" />
          <Skeleton className="h-8 w-16 rounded-lg" />
        </div>
      </div>

      <ActivitiesContentSkeleton />
    </div>
  );
}

function ActivitiesContentSkeleton() {
  return (
    <div className="h-full overflow-hidden px-4 pb-5 pt-16 sm:pt-20">
      <section>
        <Skeleton className="h-4 w-32 rounded-md" />

        <div className="mt-3 flex items-center gap-3 rounded-xl ring-1 ring-foreground/10 px-4 py-3">
          <Skeleton className="size-8 shrink-0 rounded-lg" />
          <div className="min-w-0 flex-1">
            <Skeleton className="h-4 w-48 max-w-full rounded-md" />
            <Skeleton className="mt-2 h-3 w-36 max-w-full rounded-md" />
          </div>
          <Skeleton className="hidden h-7 w-16 shrink-0 rounded-lg sm:block" />
        </div>
      </section>

      <section className="mt-6">
        <div className="flex items-center justify-between gap-3">
          <Skeleton className="h-4 w-32 rounded-md" />
          <Skeleton className="h-8 w-28 rounded-lg" />
        </div>

        <div className="mt-3 hidden overflow-hidden rounded-xl ring-1 ring-foreground/10 sm:block">
          <div className="grid grid-cols-[1.5fr_repeat(3,0.6fr)] gap-4 bg-muted/25 px-4 py-3">
            <Skeleton className="h-3 w-14 rounded-md" />
            <Skeleton className="h-3 w-12 justify-self-end rounded-md" />
            <Skeleton className="h-3 w-8 justify-self-end rounded-md" />
            <Skeleton className="h-3 w-12 justify-self-end rounded-md" />
          </div>
          <ProgressRow />
          <ProgressRow short />
          <ProgressRow />
        </div>

        <div className="mt-3 divide-y divide-border overflow-hidden rounded-xl ring-1 ring-foreground/10 sm:hidden">
          <CompactProgressRow />
          <CompactProgressRow />
        </div>
      </section>
    </div>
  );
}

function ProgressRow({ short = false }: { short?: boolean }) {
  return (
    <div className="grid grid-cols-[1.5fr_repeat(3,0.6fr)] items-center gap-4 border-t border-border px-4 py-3">
      <Skeleton className={short ? 'h-3.5 w-24 rounded-md' : 'h-3.5 w-36 max-w-full rounded-md'} />
      <Skeleton className="h-3 w-12 justify-self-end rounded-md" />
      <Skeleton className="h-3 w-10 justify-self-end rounded-md" />
      <Skeleton className="h-3 w-12 justify-self-end rounded-md" />
    </div>
  );
}

function CompactProgressRow() {
  return (
    <div className="p-3">
      <div className="flex items-center justify-between gap-4">
        <Skeleton className="h-4 w-32 max-w-full rounded-md" />
        <Skeleton className="h-5 w-14 rounded-full" />
      </div>
      <div className="mt-4 grid grid-cols-3 gap-4">
        <Skeleton className="h-3 w-12 rounded-md" />
        <Skeleton className="h-3 w-12 rounded-md" />
        <Skeleton className="h-3 w-12 rounded-md" />
      </div>
    </div>
  );
}

function CollaborationSkeleton() {
  return (
    <div className="relative min-h-0 overflow-hidden border-l border-border">
      <div className="absolute inset-x-0 top-0 z-10 bg-background/80 px-4 py-3 backdrop-blur-md">
        <div className="flex gap-2">
          <Skeleton className="h-8 w-14 rounded-lg" />
          <Skeleton className="h-8 w-14 rounded-lg" />
          <Skeleton className="h-8 w-20 rounded-lg" />
          <Skeleton className="h-8 w-16 rounded-lg" />
        </div>
      </div>

      <div className="flex flex-col gap-3 px-4 pb-4 pt-20">
        <FeedRow />
        <FeedRow short />

        <div className="rounded-xl ring-1 ring-foreground/10 p-4">
          <div className="flex items-center gap-3">
            <Skeleton className="size-7 shrink-0 rounded-full" />
            <Skeleton className="h-3.5 w-28 rounded-md" />
            <Skeleton className="ml-auto h-3 w-14 rounded-md" />
          </div>
          <Skeleton className="mt-4 h-3.5 w-11/12 rounded-md" />
          <Skeleton className="mt-2 h-3.5 w-3/4 rounded-md" />
        </div>

        <div className="rounded-xl ring-1 ring-foreground/10 p-4">
          <div className="flex items-center gap-3">
            <Skeleton className="size-7 shrink-0 rounded-full" />
            <Skeleton className="h-3.5 w-24 rounded-md" />
          </div>
          <Skeleton className="mt-4 h-3.5 w-4/5 rounded-md" />
          <Skeleton className="mt-2 h-3.5 w-2/3 rounded-md" />
        </div>
      </div>
    </div>
  );
}

function FeedRow({ short = false }: { short?: boolean }) {
  return (
    <div className="flex items-center gap-3 px-1 py-2">
      <Skeleton className="size-7 shrink-0 rounded-full" />
      <div className="min-w-0 flex-1">
        <Skeleton className={short ? 'h-3.5 w-44 max-w-full rounded-md' : 'h-3.5 w-56 max-w-full rounded-md'} />
        <Skeleton className="mt-2 h-3 w-24 rounded-md" />
      </div>
      <Skeleton className="h-3 w-14 shrink-0 rounded-md" />
    </div>
  );
}

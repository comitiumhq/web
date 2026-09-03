import { Card } from '@comitium/ui/card';

import { PublicScheduleFrame } from './public-schedule-frame';
import { ScheduleCalendarSkeleton, ScheduleSlotsSkeleton, ScheduleSummarySkeleton } from './schedule-skeletons';

export function PublicScheduleLoading() {
  return (
    <PublicScheduleFrame size="wide">
      <Card className="w-full gap-0 py-0">
        <div className="grid min-w-0 md:grid-cols-[minmax(0,280px)_minmax(0,1fr)] lg:grid-cols-[minmax(0,300px)_minmax(0,1fr)] xl:grid-cols-[minmax(0,300px)_minmax(0,1fr)_minmax(0,260px)]">
          <ScheduleSummarySkeleton />

          <section className="min-w-0 border-t border-border/70 p-5 sm:p-6 md:border-t-0 lg:p-6">
            <ScheduleCalendarSkeleton />
          </section>

          <section className="min-w-0 border-t border-border/70 p-5 sm:p-6 md:col-start-2 xl:col-start-auto xl:border-t-0 xl:border-l">
            <ScheduleSlotsSkeleton />
          </section>
        </div>
      </Card>
    </PublicScheduleFrame>
  );
}

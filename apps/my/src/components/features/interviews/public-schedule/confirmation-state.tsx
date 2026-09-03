import { Button } from '@comitium/ui/button';
import { Card } from '@comitium/ui/card';
import { formatInTimezone } from '@comitium/ui/date';
import { ArrowSquareOutIcon, CheckIcon } from '@phosphor-icons/react';
import { addMinutes, parseISO } from 'date-fns';
import type {
  AvailablePublicScheduleState,
  BookPublicScheduleResponse,
  PublicScheduleSlot,
} from '@/lib/schemas/public-schedule';

import { PublicScheduleFrame } from './public-schedule-frame';
import { ScheduleSummary } from './schedule-summary';

export function PublicScheduleConfirmation({
  confirmation,
  state,
  timeZone,
}: {
  confirmation: BookPublicScheduleResponse['data'];
  state: AvailablePublicScheduleState;
  timeZone: string;
}) {
  const scheduledAt = parseISO(confirmation.scheduledAt);
  const confirmedSlot: PublicScheduleSlot = {
    start: scheduledAt.toISOString(),
    end: addMinutes(scheduledAt, state.interview.durationMinutes).toISOString(),
  };
  return (
    <PublicScheduleFrame size="compact">
      <Card className="w-full gap-0 py-0">
        <div className="grid min-w-0 md:grid-cols-[minmax(0,300px)_minmax(0,1fr)] lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
          <ScheduleSummary
            state={state}
            timeZone={timeZone}
            isDisabled
            onTimeZoneChange={null}
            selectedSlot={confirmedSlot}
          />

          <section className="min-w-0 border-t border-border/70 p-5 sm:p-6 md:border-t-0 lg:p-8">
            <div className="mx-auto flex max-w-sm flex-col items-center gap-5 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-success/10 text-success-text ring-1 ring-success/20">
                <CheckIcon className="size-6" aria-hidden="true" />
              </div>

              <div>
                <h1 className="text-heading-20">Interview booked</h1>
                <p className="mt-1 text-copy-14 text-muted-foreground">
                  A calendar invite was sent to the email on your scheduling request.
                </p>
              </div>

              <div className="w-full rounded-xl bg-muted/50 px-4 py-3 ring-1 ring-foreground/10">
                <p className="text-heading-14">{formatInTimezone(confirmation.scheduledAt, timeZone, 'EEE, MMM d')}</p>
                <p className="mt-1 text-copy-14 text-muted-foreground">
                  {formatInTimezone(confirmation.scheduledAt, timeZone, 'h:mm a')} ({timeZone})
                </p>
              </div>

              {confirmation.meetingUrl && (
                <Button asChild variant="outline">
                  <a href={confirmation.meetingUrl} target="_blank" rel="noreferrer">
                    <ArrowSquareOutIcon className="size-4" />
                    Open meeting link
                  </a>
                </Button>
              )}
            </div>
          </section>
        </div>
      </Card>
    </PublicScheduleFrame>
  );
}

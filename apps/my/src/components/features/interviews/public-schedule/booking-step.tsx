import { Alert, AlertDescription } from '@comitium/ui/alert';
import { Button } from '@comitium/ui/button';
import { Card } from '@comitium/ui/card';
import { SpinnerGapIcon } from '@phosphor-icons/react';
import { useCallback } from 'react';
import type { AvailablePublicScheduleState, PublicScheduleSlot } from '@/lib/schemas/public-schedule';

import { PublicScheduleFrame } from './public-schedule-frame';
import { ScheduleSummary } from './schedule-summary';

interface PublicScheduleBookingStepProps {
  state: AvailablePublicScheduleState;
  timeZone: string;
  selectedSlot: PublicScheduleSlot;
  isPending: boolean;
  submitError: string | null;
  onBack: () => void;
  onSubmit: () => void;
}

export function PublicScheduleBookingStep({
  state,
  timeZone,
  selectedSlot,
  isPending,
  submitError,
  onBack,
  onSubmit,
}: PublicScheduleBookingStepProps) {
  const handleConfirm = useCallback(() => {
    onSubmit();
  }, [onSubmit]);

  return (
    <PublicScheduleFrame size="compact">
      <Card className="w-full gap-0 py-0">
        <div className="grid min-w-0 md:grid-cols-[minmax(0,300px)_minmax(0,1fr)] lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
          <ScheduleSummary
            state={state}
            timeZone={timeZone}
            isDisabled={isPending}
            onTimeZoneChange={null}
            selectedSlot={selectedSlot}
          />

          <section className="min-w-0 border-t border-border/70 p-5 sm:p-6 md:border-t-0 lg:p-8">
            <div className="mx-auto max-w-sm space-y-5">
              {submitError && (
                <Alert variant="destructive">
                  <AlertDescription>{submitError}</AlertDescription>
                </Alert>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" disabled={isPending} onClick={onBack}>
                  Back
                </Button>
                <Button type="button" size="lg" className="min-w-36" disabled={isPending} onClick={handleConfirm}>
                  {isPending ? <SpinnerGapIcon className="size-4 animate-spin" /> : null}
                  {isPending ? 'Booking...' : 'Confirm booking'}
                </Button>
              </div>
            </div>
          </section>
        </div>
      </Card>
    </PublicScheduleFrame>
  );
}

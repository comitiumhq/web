import { Card, CardContent } from '@comitium/ui/card';
import { cn } from '@comitium/ui/cn';
import {
  CheckIcon,
  LinkBreakIcon,
  type Icon as PhosphorIcon,
  WarningDiamondIcon,
  XCircleIcon,
} from '@phosphor-icons/react';
import type { PublicScheduleStatus } from '@/lib/schemas/public-schedule';

import { PublicScheduleFrame } from './public-schedule-frame';

type TerminalTone = 'success' | 'warning' | 'muted';

const TERMINAL_COPY: Record<
  Exclude<PublicScheduleStatus, 'available'>,
  { title: string; description: string; icon: PhosphorIcon; tone: TerminalTone }
> = {
  booked: {
    title: 'This interview is already booked',
    description: 'The scheduling link has already been used.',
    icon: CheckIcon,
    tone: 'success',
  },
  cancelled: {
    title: 'This scheduling link was cancelled',
    description: 'Please contact the recruiting team if you still need to schedule this interview.',
    icon: XCircleIcon,
    tone: 'warning',
  },
  expired: {
    title: 'This scheduling link expired',
    description: 'Please contact the recruiting team for a new link.',
    icon: LinkBreakIcon,
    tone: 'muted',
  },
  unavailable: {
    title: 'This scheduling link is unavailable',
    description: 'The link may be invalid, inactive, or no longer tied to an open interview.',
    icon: WarningDiamondIcon,
    tone: 'warning',
  },
};

export function PublicScheduleTerminalState({ status }: { status: Exclude<PublicScheduleStatus, 'available'> }) {
  const copy = TERMINAL_COPY[status];
  const Icon = copy.icon;

  return (
    <PublicScheduleFrame size="compact">
      <Card className="w-full gap-0 py-0 text-center">
        <CardContent className="flex min-h-[280px] flex-col items-center justify-center gap-4 p-8 sm:min-h-[320px] sm:p-10">
          <div
            className={cn(
              'flex size-12 items-center justify-center rounded-full ring-1',
              copy.tone === 'success' && 'bg-success/10 text-success-text ring-success/20',
              copy.tone === 'warning' && 'bg-warning/10 text-warning-text ring-warning/20',
              copy.tone === 'muted' && 'bg-muted text-muted-foreground ring-foreground/10',
            )}
          >
            <Icon className="size-6" aria-hidden="true" />
          </div>
          <div className="space-y-2">
            <h1 className="text-heading-20">{copy.title}</h1>
            <p className="mx-auto max-w-md text-copy-14 text-muted-foreground">{copy.description}</p>
          </div>
        </CardContent>
      </Card>
    </PublicScheduleFrame>
  );
}

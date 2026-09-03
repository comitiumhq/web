import { Tooltip, TooltipContent, TooltipTrigger } from '@comitium/ui/tooltip';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

import type { CardUrgency } from './pipeline-status';

const URGENCY_ACCENT: Record<Exclude<CardUrgency, 'none'>, string> = {
  critical: 'bg-destructive-text',
  attention: 'bg-warning-text',
};

interface UrgencyStripeProps {
  level: CardUrgency;
  reason: string | null;
  side?: ComponentProps<typeof TooltipContent>['side'];
}

export function UrgencyStripe({ level, reason, side = 'right' }: UrgencyStripeProps) {
  if (level === 'none') {
    return null;
  }

  const stripe = (
    <span data-slot="urgency-stripe" className="absolute -inset-y-px -left-px w-3 cursor-help">
      <span className={cn('block h-full w-1', URGENCY_ACCENT[level])} />
    </span>
  );

  if (!reason) {
    return stripe;
  }

  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>{stripe}</TooltipTrigger>
      <TooltipContent side={side} sideOffset={4} className="max-w-56 text-center">
        {reason}
      </TooltipContent>
    </Tooltip>
  );
}

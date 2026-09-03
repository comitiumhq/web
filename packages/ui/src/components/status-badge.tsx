import type { ComponentProps, ReactNode } from 'react';

import { Badge } from './badge';
import { Tooltip, TooltipContent, TooltipTrigger } from './tooltip';

export interface StatusBadgeProps {
  variant: ComponentProps<typeof Badge>['variant'];
  label: ReactNode;
  tooltip?: ReactNode;
  className?: string;
}

export function StatusBadge({ variant, label, tooltip, className }: StatusBadgeProps) {
  const badge = (
    <Badge variant={variant} className={className}>
      {label}
    </Badge>
  );

  if (!tooltip) {
    return badge;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex w-fit">{badge}</span>
      </TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  );
}

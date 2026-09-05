import { Button } from '@comitium/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@comitium/ui/tooltip';
import { PlusIcon } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

interface CreateJobButtonProps {
  disabledReason?: string;
  onClick: () => void;
  className?: string;
}

export function CreateJobButton({ disabledReason, onClick, className }: CreateJobButtonProps) {
  const button = (
    <Button
      onClick={disabledReason ? undefined : onClick}
      aria-disabled={Boolean(disabledReason)}
      className={cn('shrink-0', className, { 'cursor-not-allowed opacity-50': disabledReason })}
    >
      <PlusIcon data-icon="inline-start" />
      New Job
    </Button>
  );

  if (!disabledReason) {
    return button;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent>{disabledReason}</TooltipContent>
    </Tooltip>
  );
}

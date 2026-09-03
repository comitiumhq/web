import { Button } from '@comitium/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@comitium/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@comitium/ui/tooltip';
import { CalendarBlankIcon, CalendarPlusIcon, CaretDownIcon, LinkSimpleIcon } from '@phosphor-icons/react';
import { useCallback } from 'react';
import { useQueryCalendarStatus } from '@/hooks/queries/use-query-interviews';
import { useEncryptionUnlocked } from '@/hooks/use-encryption-unlocked';

import { getCalendarActionDisabledReason } from './calendar-action-availability';

interface NewInterviewButtonProps {
  orgId: string;
  onManualSchedule: () => void;
  onDirectBooking: () => void;
}

export function NewInterviewButton({ orgId, onManualSchedule, onDirectBooking }: NewInterviewButtonProps) {
  const calendarQuery = useQueryCalendarStatus(orgId);
  const { runUnlocked } = useEncryptionUnlocked(orgId);
  const disabledReason = getCalendarActionDisabledReason({
    hasData: Boolean(calendarQuery.data),
    isLoading: calendarQuery.isLoading,
    isError: calendarQuery.isError,
    isConnected: calendarQuery.data?.calendarConnected === true,
  });

  const handleManualSchedule = useCallback(() => runUnlocked(onManualSchedule), [runUnlocked, onManualSchedule]);
  const handleDirectBooking = useCallback(() => runUnlocked(onDirectBooking), [runUnlocked, onDirectBooking]);

  if (!disabledReason) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="outline" size="sm">
            <CalendarPlusIcon data-icon="inline-start" />
            New Interview
            <CaretDownIcon data-icon="inline-end" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-72">
          <DropdownMenuItem className="items-start" onSelect={handleManualSchedule}>
            <CalendarBlankIcon className="mt-0.5" />
            <span className="flex min-w-0 flex-col">
              <span className="font-medium">Schedule manually</span>
              <span className="text-xs text-muted-foreground">Pick a time and send invites.</span>
            </span>
          </DropdownMenuItem>
          <DropdownMenuItem className="items-start" onSelect={handleDirectBooking}>
            <LinkSimpleIcon className="mt-0.5" />
            <span className="flex min-w-0 flex-col">
              <span className="font-medium">Send scheduling link</span>
              <span className="text-xs text-muted-foreground">Let the candidate pick a time.</span>
            </span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-disabled="true"
          className="cursor-not-allowed opacity-50"
        >
          <CalendarPlusIcon data-icon="inline-start" />
          New Interview
        </Button>
      </TooltipTrigger>
      <TooltipContent>{disabledReason}</TooltipContent>
    </Tooltip>
  );
}

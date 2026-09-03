interface CalendarAvailability {
  hasData: boolean;
  isLoading: boolean;
  isError: boolean;
  isConnected: boolean;
}

export function getCalendarActionDisabledReason({
  hasData,
  isLoading,
  isError,
  isConnected,
}: CalendarAvailability): string | null {
  if (hasData) {
    return isConnected ? null : 'Connect your calendar';
  }

  if (isLoading) {
    return 'Checking calendar connection...';
  }

  if (isError) {
    return 'Calendar connection status is unavailable.';
  }

  return 'Connect your calendar';
}

import { describe, expect, it } from 'vitest';

import { getCalendarActionDisabledReason } from './calendar-action-availability';

describe('getCalendarActionDisabledReason', () => {
  it('preserves the cached connected state during a background error', () => {
    expect(
      getCalendarActionDisabledReason({ hasData: true, isLoading: false, isError: true, isConnected: true }),
    ).toBeNull();
  });

  it('uses cached disconnected state instead of replacing it with a background error', () => {
    expect(
      getCalendarActionDisabledReason({ hasData: true, isLoading: false, isError: true, isConnected: false }),
    ).toBe('Connect your calendar');
  });

  it('explains initial loading and error states', () => {
    expect(
      getCalendarActionDisabledReason({ hasData: false, isLoading: true, isError: false, isConnected: false }),
    ).toBe('Checking calendar connection...');
    expect(
      getCalendarActionDisabledReason({ hasData: false, isLoading: false, isError: true, isConnected: false }),
    ).toBe('Calendar connection status is unavailable.');
  });
});

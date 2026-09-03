import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import type { AvailablePublicScheduleState, PublicScheduleSlot } from '@/lib/schemas/public-schedule';
import { AvailablePublicSchedule } from './available-schedule';

interface MutationCallbacks {
  onError: (error: unknown) => void;
  onSuccess: (result: { data: { scheduledAt: string; meetingUrl: string | null } }) => void;
}

const slot: PublicScheduleSlot = {
  start: '2026-09-01T10:00:00.000Z',
  end: '2026-09-01T10:30:00.000Z',
};

const mocks = vi.hoisted(() => ({
  bookSlot: vi.fn(),
  isPending: false,
  refetchSlots: vi.fn(),
  slots: [] as PublicScheduleSlot[],
}));

vi.mock('@/hooks/mutations/use-public-schedule-mutations', () => ({
  useBookPublicScheduleSlot: () => ({ mutate: mocks.bookSlot, isPending: mocks.isPending }),
}));

vi.mock('@/hooks/queries/use-query-public-schedule', () => ({
  useQueryPublicScheduleSlots: () => ({
    data: { data: { slots: mocks.slots } },
    error: null,
    isFetching: false,
    isLoading: false,
    refetch: mocks.refetchSlots,
  }),
}));

vi.mock('./slot-selection-step', () => ({
  PublicScheduleSlotSelectionStep: ({
    selectedDayGroup,
    submitError,
    onSelectSlot,
  }: {
    selectedDayGroup: { slots: PublicScheduleSlot[] } | null;
    submitError: string | null;
    onSelectSlot: (slot: PublicScheduleSlot) => void;
  }) => (
    <main>
      <p>Choose a time</p>
      {submitError ? <div role="alert">{submitError}</div> : null}
      <button type="button" onClick={() => selectedDayGroup && onSelectSlot(selectedDayGroup.slots[0])}>
        Select first slot
      </button>
    </main>
  ),
}));

vi.mock('./booking-step', () => ({
  PublicScheduleBookingStep: ({ onBack, onSubmit }: { onBack: () => void; onSubmit: () => void }) => (
    <main>
      <p>Review booking</p>
      <button type="button" onClick={onBack}>
        Back
      </button>
      <button type="button" onClick={onSubmit}>
        Confirm booking
      </button>
    </main>
  ),
}));

vi.mock('./confirmation-state', () => ({
  PublicScheduleConfirmation: () => <main>Interview booked</main>,
}));

const state = {
  status: 'available',
  defaults: { rollingDays: 14 },
  interview: { durationMinutes: 30 },
} as AvailablePublicScheduleState;

beforeEach(() => {
  mocks.bookSlot.mockReset();
  mocks.isPending = false;
  mocks.refetchSlots.mockReset();
  mocks.refetchSlots.mockResolvedValue(undefined);
  mocks.slots = [slot];
});

describe('AvailablePublicSchedule', () => {
  it('books the selected slot and renders confirmation after one successful mutation', async () => {
    const onStateRefresh = vi.fn().mockResolvedValue(undefined);
    const screen = await render(
      <AvailablePublicSchedule token="schedule-token" state={state} onStateRefresh={onStateRefresh} />,
    );

    await screen.getByRole('button', { name: 'Select first slot' }).click();
    await expect.element(screen.getByText('Review booking')).toBeInTheDocument();
    await screen.getByRole('button', { name: 'Confirm booking' }).click();

    expect(mocks.bookSlot).toHaveBeenCalledTimes(1);
    const [variables, callbacks] = mocks.bookSlot.mock.calls[0] as [
      { token: string; body: { start: string; timeZone: string } },
      MutationCallbacks,
    ];
    expect(variables).toMatchObject({
      token: 'schedule-token',
      body: { start: slot.start },
    });

    callbacks.onSuccess({ data: { scheduledAt: slot.start, meetingUrl: null } });
    await expect.element(screen.getByText('Interview booked')).toBeInTheDocument();
    expect(mocks.refetchSlots).not.toHaveBeenCalled();
    expect(onStateRefresh).not.toHaveBeenCalled();
  });

  it('returns to refreshed availability with an actionable error when the slot is no longer available', async () => {
    const onStateRefresh = vi.fn().mockResolvedValue(undefined);
    const screen = await render(
      <AvailablePublicSchedule token="schedule-token" state={state} onStateRefresh={onStateRefresh} />,
    );

    await screen.getByRole('button', { name: 'Select first slot' }).click();
    await screen.getByRole('button', { name: 'Confirm booking' }).click();
    const callbacks = mocks.bookSlot.mock.calls[0][1] as MutationCallbacks;
    callbacks.onError(new Error('That time was just booked.'));

    await expect.element(screen.getByText('Choose a time')).toBeInTheDocument();
    await expect.element(screen.getByRole('alert')).toHaveTextContent('That time was just booked.');
    expect(mocks.refetchSlots).toHaveBeenCalledTimes(1);
    expect(onStateRefresh).toHaveBeenCalledTimes(1);
  });
});

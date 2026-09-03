import { describe, expect, it } from 'vitest';
import {
  getAvailabilityRange,
  getCalendarDate,
  getCalendarDay,
  getInitialCalendarDay,
  isCalendarSlotVisible,
} from './calendar-range';

describe('calendar range', () => {
  it.each(['America/New_York', 'Europe/Warsaw', 'Pacific/Kiritimati', 'Etc/GMT+12'])(
    'preserves the visible calendar day in %s',
    (timeZone) => {
      const date = getCalendarDate('2026-09-01', timeZone);

      expect(getCalendarDay(date, timeZone)).toBe('2026-09-01');
    },
  );

  it('builds the availability range from midnight in the selected timezone', () => {
    expect(getAvailabilityRange('2026-09-01', 'America/New_York')).toEqual({
      start: '2026-09-01T04:00:00.000Z',
      end: '2026-09-02T03:59:59.999Z',
    });
  });

  it('derives the initial visible day from an existing slot', () => {
    expect(getInitialCalendarDay('2026-09-01T23:30:00.000Z', 'Europe/Warsaw')).toBe('2026-09-02');
  });

  it('rejects a slot from a different visible day', () => {
    expect(
      isCalendarSlotVisible({
        value: '2026-09-02T10:00:00.000Z',
        availabilityRange: getAvailabilityRange('2026-09-03', 'Europe/Warsaw'),
        timeZone: 'Europe/Warsaw',
        durationMinutes: 60,
      }),
    ).toBe(false);
  });

  it('rejects a slot moved outside visible hours by a timezone change', () => {
    expect(
      isCalendarSlotVisible({
        value: '2026-09-01T10:15:00.000Z',
        availabilityRange: getAvailabilityRange('2026-09-01', 'America/New_York'),
        timeZone: 'America/New_York',
        durationMinutes: 60,
      }),
    ).toBe(false);
  });

  it('keeps a slot that remains fully inside the visible calendar window', () => {
    expect(
      isCalendarSlotVisible({
        value: '2026-09-01T15:15:00.000Z',
        availabilityRange: getAvailabilityRange('2026-09-01', 'Europe/Warsaw'),
        timeZone: 'Europe/Warsaw',
        durationMinutes: 45,
      }),
    ).toBe(true);
  });

  it('rejects a slot whose duration extends past the visible calendar window', () => {
    expect(
      isCalendarSlotVisible({
        value: '2026-09-01T17:15:00.000Z',
        availabilityRange: getAvailabilityRange('2026-09-01', 'Europe/Warsaw'),
        timeZone: 'Europe/Warsaw',
        durationMinutes: 60,
      }),
    ).toBe(false);
  });
});

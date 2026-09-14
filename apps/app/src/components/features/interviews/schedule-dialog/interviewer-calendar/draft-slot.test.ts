import { describe, expect, it } from 'vitest';
import {
  getDraftMinutesFromPointer,
  getDroppedDraftSlot,
  getMinimumDraftMinutes,
  getPointerSlotStart,
  getZonedMinutes,
} from './draft-slot';

describe('draft slot', () => {
  it('reads wall-clock minutes in the selected timezone', () => {
    expect(getZonedMinutes('2026-09-01T14:30:00.000Z', 'Europe/Warsaw')).toBe(16 * 60 + 30);
  });

  it('uses the next 5-minute boundary as the minimum on the current day', () => {
    expect(
      getMinimumDraftMinutes('2026-09-01T12:00:00.000Z', 'Europe/Warsaw', 45, new Date('2026-09-01T12:07:00.000Z')),
    ).toBe(14 * 60 + 10);
  });

  it('rejects past days and current days without room for the interview', () => {
    expect(
      getMinimumDraftMinutes('2026-08-31T12:00:00.000Z', 'Europe/Warsaw', 45, new Date('2026-09-01T12:00:00.000Z')),
    ).toBeNull();
    expect(
      getMinimumDraftMinutes('2026-09-01T12:00:00.000Z', 'Europe/Warsaw', 60, new Date('2026-09-01T17:30:00.000Z')),
    ).toBeNull();
  });

  it('converts pointer movement to calendar minutes and clamps the result', () => {
    expect(getDraftMinutesFromPointer(10 * 60, 120, 720, 60, 8 * 60)).toBe(12 * 60);
    expect(getDraftMinutesFromPointer(10 * 60, -720, 720, 60, 9 * 60)).toBe(9 * 60);
  });

  it('snaps a drop to 5 minutes without changing its visible day', () => {
    expect(
      getDroppedDraftSlot(
        '2026-09-02T08:00:00.000Z',
        'Europe/Warsaw',
        13 * 60 + 7,
        45,
        new Date('2026-09-01T08:00:00.000Z'),
      ),
    ).toMatchObject({
      value: '2026-09-02T11:05:00.000Z',
      minutes: 13 * 60 + 5,
    });
  });

  it('resolves a pointer position within a rendered cell to a 5-minute slot', () => {
    const cellStart = new Date('2026-09-02T11:15:00.000Z');

    expect(getPointerSlotStart(cellStart, 0, 60).toISOString()).toBe('2026-09-02T11:15:00.000Z');
    expect(getPointerSlotStart(cellStart, 24, 60).toISOString()).toBe('2026-09-02T11:20:00.000Z');
    expect(getPointerSlotStart(cellStart, 59, 60).toISOString()).toBe('2026-09-02T11:25:00.000Z');
  });
});

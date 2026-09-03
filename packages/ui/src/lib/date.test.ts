import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  compareDatesAsc,
  compareDatesDesc,
  formatCompactDate,
  formatDate,
  formatDeadlineDate,
  formatDurationSeconds,
  formatElapsedDaysSince,
  formatElapsedDuration,
  formatInTimezone,
  formatRelativeTime,
  formatTimeRemaining,
  getElapsedDaysSince,
  isPastDate,
  isWithinDays,
} from './date';

// Fixed time: March 7, 2026 12:00:00 UTC
const NOW = new Date('2026-03-07T12:00:00Z');

beforeEach(() => {
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('date', () => {
  describe('formatDate', () => {
    it('formats ISO string', () => {
      expect(formatDate('2026-03-07T12:00:00Z')).toBe('Mar 7, 2026');
    });

    it('formats with custom format', () => {
      expect(formatDate('2026-03-07T12:00:00Z', 'yyyy-MM-dd')).toBe('2026-03-07');
    });

    it('returns empty string for null', () => {
      expect(formatDate(null)).toBe('');
    });

    it('returns empty string for undefined', () => {
      expect(formatDate(undefined)).toBe('');
    });
  });

  describe('formatCompactDate', () => {
    it('hides the year for dates in the current year', () => {
      expect(formatCompactDate('2026-11-12T09:00:00Z')).toBe('Nov 12');
    });

    it('shows the year for dates outside the current year', () => {
      expect(formatCompactDate('2025-11-12T09:00:00Z')).toBe('Nov 12, 2025');
    });

    it('returns empty string for null', () => {
      expect(formatCompactDate(null)).toBe('');
    });
  });

  describe('formatInTimezone', () => {
    it('formats a date in the requested timezone', () => {
      expect(formatInTimezone('2026-03-07T12:00:00Z', 'America/New_York', 'MMM d, h:mm a')).toBe('Mar 7, 7:00 AM');
    });

    it('falls back to browser timezone for an invalid timezone', () => {
      expect(formatInTimezone('2026-03-07T12:00:00Z', 'Invalid/Zone', 'MMM d, yyyy')).toBe('Mar 7, 2026');
    });
  });

  describe('formatElapsedDuration', () => {
    it('formats elapsed time from the current clock', () => {
      expect(formatElapsedDuration('2026-03-05T06:30:00Z')).toBe('2d 5h');
    });

    it('returns empty string for null', () => {
      expect(formatElapsedDuration(null)).toBe('');
    });
  });

  describe('formatDurationSeconds', () => {
    it('formats days and hours', () => {
      expect(formatDurationSeconds(277_200)).toBe('3d 5h');
    });

    it('formats hours and minutes', () => {
      expect(formatDurationSeconds(9_000)).toBe('2h 30m');
    });

    it('formats sub-minute durations', () => {
      expect(formatDurationSeconds(30)).toBe('<1m');
    });
  });

  describe('formatRelativeTime', () => {
    it('formats past date', () => {
      const twoHoursAgo = new Date(NOW.getTime() - 2 * 60 * 60 * 1000).toISOString();
      const result = formatRelativeTime(twoHoursAgo);

      expect(result).toContain('2 hours ago');
    });

    it('formats future date', () => {
      const inThreeDays = new Date(NOW.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString();
      const result = formatRelativeTime(inThreeDays);

      expect(result).toContain('in');
      expect(result).toContain('3 days');
    });

    it('returns empty string for null', () => {
      expect(formatRelativeTime(null)).toBe('');
    });
  });

  describe('formatTimeRemaining', () => {
    it('formats future deadline', () => {
      const inThreeDays = new Date(NOW.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString();
      const result = formatTimeRemaining(inThreeDays);

      expect(result).toContain('left');
    });

    it('returns Expired for past deadline', () => {
      const yesterday = new Date(NOW.getTime() - 24 * 60 * 60 * 1000).toISOString();

      expect(formatTimeRemaining(yesterday)).toBe('Expired');
    });

    it('returns null for null input', () => {
      expect(formatTimeRemaining(null)).toBeNull();
    });
  });

  describe('formatDeadlineDate', () => {
    it('formats date N days from now', () => {
      expect(formatDeadlineDate(3)).toBe('March 10, 2026');
    });

    it('formats date 14 days from now', () => {
      expect(formatDeadlineDate(14)).toBe('March 21, 2026');
    });
  });

  describe('isPastDate', () => {
    it('returns true for past date', () => {
      expect(isPastDate('2025-01-01T00:00:00Z')).toBe(true);
    });

    it('returns false for future date', () => {
      expect(isPastDate('2027-01-01T00:00:00Z')).toBe(false);
    });

    it('returns false for null', () => {
      expect(isPastDate(null)).toBe(false);
    });

    it('returns false for undefined', () => {
      expect(isPastDate(undefined)).toBe(false);
    });
  });

  describe('isWithinDays', () => {
    it('returns true when within N days', () => {
      const in2Days = new Date(NOW.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString();

      expect(isWithinDays(in2Days, 5)).toBe(true);
    });

    it('returns false when beyond N days', () => {
      const in10Days = new Date(NOW.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString();

      expect(isWithinDays(in10Days, 5)).toBe(false);
    });

    it('returns false for past date', () => {
      expect(isWithinDays('2025-01-01T00:00:00Z', 5)).toBe(false);
    });

    it('returns false for null', () => {
      expect(isWithinDays(null, 5)).toBe(false);
    });
  });

  describe('getElapsedDaysSince', () => {
    it('returns whole days elapsed from the current clock', () => {
      expect(getElapsedDaysSince('2026-03-02T12:00:00Z')).toBe(5);
    });

    it('returns null for null', () => {
      expect(getElapsedDaysSince(null)).toBeNull();
    });
  });

  describe('formatElapsedDaysSince', () => {
    it('formats elapsed time as days only', () => {
      expect(formatElapsedDaysSince('2026-03-02T06:30:00Z')).toBe('5d');
    });

    it('returns <1d for same-day elapsed time', () => {
      expect(formatElapsedDaysSince('2026-03-07T06:30:00Z')).toBe('<1d');
    });

    it('returns empty string for null', () => {
      expect(formatElapsedDaysSince(null)).toBe('');
    });
  });

  describe('sorting helpers', () => {
    const dates = ['2026-03-01', '2026-03-05', '2026-03-03'];

    it('compareDatesAsc sorts oldest first', () => {
      const sorted = [...dates].sort(compareDatesAsc);

      expect(sorted).toEqual(['2026-03-01', '2026-03-03', '2026-03-05']);
    });

    it('compareDatesDesc sorts newest first', () => {
      const sorted = [...dates].sort(compareDatesDesc);

      expect(sorted).toEqual(['2026-03-05', '2026-03-03', '2026-03-01']);
    });

    it('compareDatesAsc handles null as epoch (sorted before real dates)', () => {
      const result = compareDatesAsc(null, '2026-03-01');

      expect(result).toBeLessThan(0);
    });
  });
});

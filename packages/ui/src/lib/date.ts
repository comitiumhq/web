import { TZDate } from '@date-fns/tz';
import {
  addDays,
  compareAsc,
  compareDesc,
  constructNow,
  differenceInDays,
  format,
  formatDistanceToNow,
  formatDistanceToNowStrict,
  isPast,
  isThisYear,
} from 'date-fns';

import { BROWSER_TZ } from './timezones';

export function getCurrentDate(): Date {
  return constructNow(0);
}

/**
 * Check if a date string represents a past date
 */
export function isPastDate(dateString?: string | null): boolean {
  if (!dateString) {
    return false;
  }

  return isPast(new Date(dateString));
}

/**
 * Format a date (string or Date object) to a readable format (e.g., "Jan 15, 2025")
 */
export function formatDate(date?: Date | string | null, formatStr = 'MMM d, yyyy'): string {
  if (!date) {
    return '';
  }

  return format(date, formatStr);
}

export function formatCompactDate(date?: Date | string | null): string {
  if (!date) {
    return '';
  }

  return formatDate(date, isThisYear(date) ? 'MMM d' : 'MMM d, yyyy');
}

/**
 * Format a date as relative time (e.g., "2 hours ago", "in 3 days")
 */
export function formatRelativeTime(dateString?: string | null, options?: { addSuffix?: boolean }): string {
  if (!dateString) {
    return '';
  }

  return formatDistanceToNow(new Date(dateString), { addSuffix: options?.addSuffix ?? true });
}

/**
 * Format time remaining until a deadline (e.g., "2 days left", "Expired")
 */
export function formatTimeRemaining(dateString?: string | null): string | null {
  if (!dateString) {
    return null;
  }

  const date = new Date(dateString);

  if (isPast(date)) {
    return 'Expired';
  }

  return `${formatDistanceToNowStrict(date)} left`;
}

/**
 * Format a future date N days from now (e.g., "March 15, 2026")
 */
export function formatDeadlineDate(daysFromNow: number): string {
  return format(addDays(new Date(), daysFromNow), 'MMMM d, yyyy');
}

/**
 * Check if a future date is within N days from now
 */
export function isWithinDays(dateString: string | null | undefined, days: number): boolean {
  if (!dateString) {
    return false;
  }

  const date = new Date(dateString);

  if (isPast(date)) {
    return false;
  }

  return differenceInDays(date, new Date()) < days;
}

export function getElapsedDaysSince(dateString?: string | null): number | null {
  if (!dateString) {
    return null;
  }

  return Math.max(0, differenceInDays(new Date(), new Date(dateString)));
}

export function formatElapsedDaysSince(dateString?: string | null): string {
  const days = getElapsedDaysSince(dateString);

  if (days === null) {
    return '';
  }

  if (days === 0) {
    return '<1d';
  }

  return `${days}d`;
}

/**
 * Compare two date strings for sorting (ascending - oldest first)
 */
export function compareDatesAsc(a?: string | null, b?: string | null): number {
  const dateA = a ? new Date(a) : new Date(0);
  const dateB = b ? new Date(b) : new Date(0);

  return compareAsc(dateA, dateB);
}

/**
 * Compare two date strings for sorting (descending - newest first)
 */
export function compareDatesDesc(a?: string | null, b?: string | null): number {
  const dateA = a ? new Date(a) : new Date(0);
  const dateB = b ? new Date(b) : new Date(0);

  return compareDesc(dateA, dateB);
}

/**
 * Format a date in a specific IANA timezone (e.g. user profile TZ instead of browser).
 */
export function formatInTimezone(date: Date | string, timeZone: string, formatStr: string): string {
  try {
    return format(new TZDate(new Date(date), timeZone), formatStr);
  } catch {
    return formatDate(date, formatStr);
  }
}

/**
 * Browser's IANA timezone (e.g. "America/New_York"). Standard JS API; date-fns has no equivalent.
 */
export { BROWSER_TZ };

/**
 * Format duration between two ISO dates as compact string (e.g., "3d 5h", "2h 30m", "45m", "<1m")
 */
function formatDuration(fromIso: string | null, toIso: string): string {
  const from = fromIso ? new Date(fromIso).getTime() : 0;
  const to = new Date(toIso).getTime();

  if (!from) {
    return '';
  }

  const diffMs = to - from;

  return formatDurationMinutes(Math.floor(diffMs / 60000));
}

export function formatDurationSeconds(seconds: number): string {
  return formatDurationMinutes(Math.floor(seconds / 60));
}

function formatDurationMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d ${hours % 24}h`;
  }

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }

  if (minutes > 0) {
    return `${minutes}m`;
  }

  return '<1m';
}

export function formatElapsedDuration(fromIso?: string | null): string {
  if (!fromIso) {
    return '';
  }

  return formatDuration(fromIso, new Date().toISOString());
}

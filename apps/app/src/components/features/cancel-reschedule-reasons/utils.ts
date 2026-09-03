import type { ReasonCategory, ReasonRow } from '@/lib/schemas/cancel-reschedule-reasons';
import { compareBySortOrderThenLabel } from '@/lib/utils';

import { CATEGORY_ORDER } from './constants';

export function compareReasons(a: ReasonRow, b: ReasonRow): number {
  if (a.category !== b.category) {
    return CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category);
  }

  return compareBySortOrderThenLabel(a, b);
}

export function groupByCategory(rows: ReasonRow[]): Record<ReasonCategory, ReasonRow[]> {
  const grouped: Record<ReasonCategory, ReasonRow[]> = { candidate: [], interviewer: [], company: [] };

  for (const row of rows) {
    grouped[row.category].push(row);
  }

  return grouped;
}

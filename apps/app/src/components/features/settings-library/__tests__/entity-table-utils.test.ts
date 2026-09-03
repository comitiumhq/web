import { describe, expect, it } from 'vitest';

import { clampEntityPage, getEntityPageCount, getEntityPageRows, splitActiveArchived } from '../entity-table-utils';
import type { ArchivableEntity } from '../types';

function row(id: string, isArchived = false): ArchivableEntity {
  return {
    id,
    label: id,
    updatedAt: '2026-01-01T00:00:00.000Z',
    isArchived,
  };
}

describe('settings library table utils', () => {
  it('splits active and archived rows without reordering them', () => {
    const rows = [row('a'), row('b', true), row('c'), row('d', true)];

    expect(splitActiveArchived(rows)).toEqual({
      activeRows: [rows[0], rows[2]],
      archivedRows: [rows[1], rows[3]],
    });
  });

  it('keeps page count at least one for empty tables', () => {
    expect(getEntityPageCount(0)).toBe(1);
  });

  it('clamps a stale page after rows shrink', () => {
    expect(clampEntityPage(4, 11, 10)).toBe(2);
  });

  it('returns the requested page rows', () => {
    const rows = [row('a'), row('b'), row('c'), row('d')];

    expect(getEntityPageRows(rows, 2, 2)).toEqual([rows[2], rows[3]]);
  });
});

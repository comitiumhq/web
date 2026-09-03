import { SETTINGS_TABLE_PAGE_SIZE } from '@/lib/constants/ui-config';

import type { ArchivableEntity } from './types';

export function splitActiveArchived<T extends ArchivableEntity>(rows: T[]) {
  return {
    activeRows: rows.filter((row) => !row.isArchived),
    archivedRows: rows.filter((row) => row.isArchived),
  };
}

export function getEntityPageCount(totalRows: number, pageSize = SETTINGS_TABLE_PAGE_SIZE): number {
  return Math.max(1, Math.ceil(totalRows / pageSize));
}

export function clampEntityPage(page: number, totalRows: number, pageSize = SETTINGS_TABLE_PAGE_SIZE): number {
  return Math.min(page, getEntityPageCount(totalRows, pageSize));
}

export function getEntityPageRows<T>(rows: T[], page: number, pageSize = SETTINGS_TABLE_PAGE_SIZE): T[] {
  return rows.slice((page - 1) * pageSize, page * pageSize);
}

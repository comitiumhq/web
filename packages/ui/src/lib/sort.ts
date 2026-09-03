export function compareBySortOrderThenLabel<T extends { sortOrder: number; label: string }>(a: T, b: T): number {
  if (a.sortOrder !== b.sortOrder) {
    return a.sortOrder - b.sortOrder;
  }

  return a.label.localeCompare(b.label);
}

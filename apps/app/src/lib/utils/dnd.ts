import type { UniqueIdentifier } from '@dnd-kit/abstract';

interface DndNode {
  id: UniqueIdentifier;
  sortable?: { initialIndex: number; index: number };
}

export function applyDndReorder<T>(
  items: T[],
  getId: (item: T) => UniqueIdentifier,
  source: DndNode | null,
  target: DndNode | null,
): T[] | null {
  if (!source) {
    return null;
  }

  const sortable = source.sortable;

  if (sortable && sortable.initialIndex !== sortable.index) {
    const fromIndex = sortable.initialIndex;
    const toIndex = sortable.index;

    if (fromIndex < 0 || fromIndex >= items.length || toIndex < 0 || toIndex >= items.length) {
      return null;
    }

    const next = [...items];
    const [moved] = next.splice(fromIndex, 1);

    next.splice(toIndex, 0, moved);

    return next;
  }

  if (!target || source.id === target.id) {
    return null;
  }

  const oldIndex = items.findIndex((item) => getId(item) === source.id);
  const newIndex = items.findIndex((item) => getId(item) === target.id);

  if (oldIndex === -1 || newIndex === -1) {
    return null;
  }

  const next = [...items];
  const [moved] = next.splice(oldIndex, 1);

  next.splice(newIndex, 0, moved);

  return next;
}

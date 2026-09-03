import { move } from '@dnd-kit/helpers';
import type { DragDropEventHandlers } from '@dnd-kit/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { KanbanApplication, KanbanStage } from '@/lib/schemas/pipeline';

function findColumnForItem(columns: Record<string, string[]>, itemId: string): string | null {
  for (const [columnId, itemIds] of Object.entries(columns)) {
    if (itemIds.includes(itemId)) {
      return columnId;
    }
  }

  return null;
}

interface UseKanbanBoardStateOptions {
  stages: KanbanStage[];
  onDragEnd: (sourceStageId: string, destStageId: string, applicationId: string) => boolean;
}

export function useKanbanBoardState({ stages, onDragEnd }: UseKanbanBoardStateOptions) {
  const serverItems = useMemo(() => {
    const items: Record<string, string[]> = {};

    for (const stage of stages) {
      items[stage.id] = stage.applications.map((a) => a.id);
    }

    return items;
  }, [stages]);

  const [items, setItems] = useState(serverItems);
  const snapshot = useRef(structuredClone(serverItems));
  const itemsRef = useRef(items);
  itemsRef.current = items;

  useEffect(() => {
    setItems(serverItems);
    snapshot.current = structuredClone(serverItems);
  }, [serverItems]);

  const appMap = useMemo(() => {
    const map = new Map<string, KanbanApplication>();

    for (const stage of stages) {
      for (const app of stage.applications) {
        map.set(app.id, app);
      }
    }

    return map;
  }, [stages]);

  const handleDragStart = useCallback<DragDropEventHandlers['onDragStart']>(() => {
    snapshot.current = structuredClone(itemsRef.current);
  }, []);

  const handleDragOver = useCallback<DragDropEventHandlers['onDragOver']>((event) => {
    if (event.operation.source?.type === 'column') {
      return;
    }

    setItems((current) => move(current, event));
  }, []);

  const handleDragEnd = useCallback<DragDropEventHandlers['onDragEnd']>(
    (event) => {
      if (event.canceled) {
        setItems(snapshot.current);

        return;
      }

      const applicationId = String(event.operation.source?.id);

      if (!applicationId) {
        setItems(snapshot.current);

        return;
      }

      const sourceStageId = findColumnForItem(snapshot.current, applicationId);
      const destStageId = findColumnForItem(itemsRef.current, applicationId);

      if (!sourceStageId || !destStageId || sourceStageId === destStageId) {
        setItems(snapshot.current);

        return;
      }

      const accepted = onDragEnd(sourceStageId, destStageId, applicationId);

      if (!accepted) {
        setItems(snapshot.current);
      }
    },
    [onDragEnd],
  );

  const stageAppsMap = useMemo(() => {
    const map = new Map<string, KanbanApplication[]>();

    for (const [stageId, ids] of Object.entries(items)) {
      const apps: KanbanApplication[] = [];

      for (const id of ids) {
        const app = appMap.get(id);

        if (app) {
          apps.push(app);
        }
      }

      map.set(stageId, apps);
    }

    return map;
  }, [items, appMap]);

  return {
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    stageAppsMap,
  };
}

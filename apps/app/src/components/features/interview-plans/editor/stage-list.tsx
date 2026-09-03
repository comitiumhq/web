import { Button } from '@comitium/ui/button';
import { Card } from '@comitium/ui/card';
import type { DragDropEventHandlers } from '@dnd-kit/react';
import { DragDropProvider } from '@dnd-kit/react';
import { PlusIcon } from '@phosphor-icons/react';
import { memo, useCallback } from 'react';
import { applyDndReorder } from '@/lib/utils/dnd';

import { StageItem } from './stage-item';
import type { EditorStage } from './types';

interface StageListProps {
  stages: EditorStage[];
  onReorder: (stages: EditorStage[]) => void;
  onAddStage: () => void;
  onRemoveStage: (clientId: string) => void;
  onUpdateName: (clientId: string, name: string) => void;
}

export const StageList = memo(function StageList({
  stages,
  onReorder,
  onAddStage,
  onRemoveStage,
  onUpdateName,
}: StageListProps) {
  const lastIndex = stages.length - 1;
  const offerIndex = lastIndex - 1;
  const isPinnedIndex = useCallback((i: number) => i === 0 || i >= offerIndex, [offerIndex]);

  const handleDragEnd = useCallback<DragDropEventHandlers['onDragEnd']>(
    (event) => {
      if (event.canceled) {
        return;
      }

      const source = event.operation.source as {
        id: string;
        sortable?: { initialIndex: number; index: number };
      } | null;

      if (!source) {
        return;
      }

      const sortable = source.sortable;
      const oldIndex = sortable ? sortable.initialIndex : stages.findIndex((s) => s.clientId === source.id);
      const newIndex = sortable
        ? sortable.index
        : stages.findIndex((s) => s.clientId === (event.operation.target?.id ?? ''));

      if (isPinnedIndex(oldIndex) || isPinnedIndex(newIndex)) {
        return;
      }

      const reordered = applyDndReorder(stages, (s) => s.clientId, source, event.operation.target);

      if (!reordered) {
        return;
      }

      onReorder(reordered);
    },
    [stages, onReorder, isPinnedIndex],
  );

  return (
    <DragDropProvider onDragEnd={handleDragEnd}>
      <div className="flex flex-col">
        <Card size="sm" className="gap-0 py-0 ring-inset">
          {stages.map((stage, i) => (
            <StageItem
              key={stage.clientId}
              stage={stage}
              index={i}
              isPinned={isPinnedIndex(i)}
              onUpdateName={onUpdateName}
              onRemove={onRemoveStage}
            />
          ))}
        </Card>

        <Button variant="outline" className="mt-3 self-start" onClick={onAddStage} type="button">
          <PlusIcon data-icon="inline-start" />
          Add stage
        </Button>
      </div>
    </DragDropProvider>
  );
});

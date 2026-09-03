import { Button } from '@comitium/ui/button';
import { Input } from '@comitium/ui/input';
import { useSortable } from '@dnd-kit/react/sortable';
import { DotsSixVerticalIcon, LockIcon, TrashIcon } from '@phosphor-icons/react';
import { memo, useCallback } from 'react';
import { cn } from '@/lib/utils';

import type { EditorStage } from './types';

interface StageItemProps {
  stage: EditorStage;
  index: number;
  isPinned: boolean;
  onUpdateName: (clientId: string, name: string) => void;
  onRemove: (clientId: string) => void;
}

export const StageItem = memo(function StageItem({ stage, index, isPinned, onUpdateName, onRemove }: StageItemProps) {
  const { ref, isDragging } = useSortable({ id: stage.clientId, index, disabled: isPinned });
  const itemClassName = cn(
    'group flex min-h-14 items-center gap-3 border-b border-border/60 px-3 py-2 transition-colors last:border-b-0',
    {
      'hover:bg-muted/50': !isPinned,
      'relative z-50 bg-card shadow-lg ring-1 ring-primary/50': isDragging,
    },
  );

  const handleNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onUpdateName(stage.clientId, e.target.value);
    },
    [stage.clientId, onUpdateName],
  );

  const handleRemove = useCallback(() => {
    onRemove(stage.clientId);
  }, [stage.clientId, onRemove]);

  return (
    <div ref={ref} className={itemClassName}>
      {isPinned ? (
        <div className="flex size-8 shrink-0 items-center justify-center text-muted-foreground" aria-hidden>
          <LockIcon className="size-4" />
        </div>
      ) : (
        <div
          className="flex size-8 shrink-0 cursor-grab items-center justify-center text-muted-foreground transition-colors hover:text-foreground active:cursor-grabbing"
          aria-hidden
        >
          <DotsSixVerticalIcon className="size-4" />
        </div>
      )}

      {isPinned ? (
        <div className="flex h-9 min-w-0 flex-1 items-center rounded-4xl px-3 text-label-14 text-muted-foreground">
          <span className="truncate">{stage.name}</span>
        </div>
      ) : (
        <Input
          value={stage.name}
          onChange={handleNameChange}
          placeholder="Stage name"
          className="h-9 min-w-0 flex-1 border-transparent bg-transparent text-label-14 focus-visible:bg-input/30"
        />
      )}

      {!isPinned && (
        <Button
          variant="ghost"
          size="icon-sm"
          className="shrink-0 text-muted-foreground hover:text-destructive"
          onClick={handleRemove}
          type="button"
        >
          <TrashIcon />
        </Button>
      )}
    </div>
  );
});

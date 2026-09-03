import type { CandidateProfile } from '@comitium/schemas/candidates';
import { PointerActivationConstraints, PointerSensor } from '@dnd-kit/dom';
import { DragDropProvider } from '@dnd-kit/react';
import type { KanbanApplication, KanbanStage } from '@/lib/schemas/pipeline';
import { cn } from '@/lib/utils';

import { KanbanColumn } from './kanban-column';
import { KanbanBoardSkeleton } from './pipeline-skeletons';
import { useKanbanBoardState } from './use-kanban-board-state';

const DRAG_ACTIVATION_DISTANCE = 6;
const TOUCH_DRAG_ACTIVATION_DELAY_MS = 180;
const TOUCH_DRAG_TOLERANCE = 8;

const sensors = [
  PointerSensor.configure({
    activationConstraints(event) {
      if (event.pointerType === 'touch') {
        return [
          new PointerActivationConstraints.Delay({
            value: TOUCH_DRAG_ACTIVATION_DELAY_MS,
            tolerance: TOUCH_DRAG_TOLERANCE,
          }),
        ];
      }

      return [new PointerActivationConstraints.Distance({ value: DRAG_ACTIVATION_DISTANCE })];
    },
  }),
];

interface KanbanBoardProps {
  stages: KanbanStage[];
  isLoading: boolean;
  scrollable?: boolean;
  hideEmpty?: boolean;
  namesMap: Map<string, CandidateProfile>;
  onCardClick: (application: KanbanApplication) => void;
  onDragEnd: (sourceStageId: string, destStageId: string, applicationId: string) => boolean;
  onLoadMoreStage?: (stageId: string) => void;
  onRetryStage?: (stageId: string) => void;
  loadingStageIds?: string[];
  failedStageIds?: string[];
}

export function KanbanBoard({
  stages,
  isLoading,
  scrollable = true,
  hideEmpty = false,
  namesMap,
  onCardClick,
  onDragEnd,
  onLoadMoreStage,
  onRetryStage,
  loadingStageIds = [],
  failedStageIds = [],
}: KanbanBoardProps) {
  const { handleDragStart, handleDragOver, handleDragEnd, stageAppsMap } = useKanbanBoardState({
    stages,
    onDragEnd,
  });

  if (isLoading && stages.every((s) => s.applications.length === 0)) {
    return <KanbanBoardSkeleton />;
  }

  return (
    <DragDropProvider
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className={cn('flex w-full min-w-0 max-w-full overflow-x-auto p-4', { 'h-full': scrollable })}>
        {stages
          .filter((s) => !hideEmpty || s.total > 0)
          .map((stage, colIndex) => {
            const applications = stageAppsMap.get(stage.id) ?? stage.applications;
            const optimisticTotal = stage.total + applications.length - stage.applications.length;

            return (
              <KanbanColumn
                key={stage.id}
                id={stage.id}
                name={stage.name}
                applications={applications}
                total={optimisticTotal}
                nextCursor={stage.nextCursor}
                isLoadingMore={loadingStageIds.includes(stage.id)}
                hasLoadError={failedStageIds.includes(stage.id)}
                index={colIndex}
                scrollable={scrollable}
                namesMap={namesMap}
                onCardClick={onCardClick}
                onLoadMore={onLoadMoreStage}
                onRetry={onRetryStage}
              />
            );
          })}
      </div>
    </DragDropProvider>
  );
}

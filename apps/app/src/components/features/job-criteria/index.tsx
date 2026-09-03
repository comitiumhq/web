import type { EvaluationCriterion } from '@comitium/schemas/jobs';
import { Button } from '@comitium/ui/button';
import { type DragDropEventHandlers, DragDropProvider } from '@dnd-kit/react';
import { PlusIcon } from '@phosphor-icons/react';
import { useCallback, useState } from 'react';
import { EVALUATION_CRITERIA_HELPER_TEXT, MAX_EVALUATION_CRITERIA } from '@/lib/jobs/evaluation-criteria';
import { generateId } from '@/lib/utils';
import { applyDndReorder } from '@/lib/utils/dnd';

import { CriterionRow } from './criterion-row';
import { EmptyState } from './empty-state';

interface CriteriaTabProps {
  criteria: EvaluationCriterion[];
  onChangeCriteria: (criteria: EvaluationCriterion[]) => void;
}

export function CriteriaTab({ criteria, onChangeCriteria }: CriteriaTabProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const publish = useCallback(
    (next: EvaluationCriterion[]) => {
      onChangeCriteria(next);
    },
    [onChangeCriteria],
  );

  const handleAdd = useCallback(() => {
    if (criteria.length >= MAX_EVALUATION_CRITERIA) {
      return;
    }

    const newId = generateId();
    publish([...criteria, { id: newId, title: '', prompt: '' }]);
    setExpandedId(newId);
  }, [criteria, publish]);

  const handleUpdate = useCallback(
    (id: string, field: 'title' | 'prompt', value: string) => {
      publish(criteria.map((criterion) => (criterion.id === id ? { ...criterion, [field]: value } : criterion)));
    },
    [criteria, publish],
  );

  const handleRemove = useCallback(
    (id: string) => {
      publish(criteria.filter((criterion) => criterion.id !== id));
      setExpandedId((prev) => (prev === id ? null : prev));
    },
    [criteria, publish],
  );

  const handleToggle = useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  const handleDragEnd = useCallback<DragDropEventHandlers['onDragEnd']>(
    (event) => {
      if (event.canceled) {
        return;
      }

      const reordered = applyDndReorder(
        criteria,
        (criterion) => criterion.id,
        event.operation.source,
        event.operation.target,
      );

      if (!reordered) {
        return;
      }

      publish(reordered);
    },
    [criteria, publish],
  );

  const isMaxReached = criteria.length >= MAX_EVALUATION_CRITERIA;

  return (
    <div className="flex flex-col gap-6">
      <p className="text-copy-14 text-muted-foreground">{EVALUATION_CRITERIA_HELPER_TEXT}</p>

      {criteria.length === 0 ? (
        <EmptyState onAdd={handleAdd} />
      ) : (
        <div className="flex flex-col gap-4">
          <DragDropProvider onDragEnd={handleDragEnd}>
            <div className="flex flex-col gap-3">
              {criteria.map((item, index) => (
                <CriterionRow
                  key={item.id}
                  id={item.id}
                  index={index}
                  criterion={item}
                  isExpanded={expandedId === item.id}
                  onToggle={handleToggle}
                  onUpdate={handleUpdate}
                  onRemove={handleRemove}
                />
              ))}
            </div>
          </DragDropProvider>

          <div className="flex items-center justify-between gap-3">
            <Button variant="outline" size="sm" onClick={handleAdd} disabled={isMaxReached}>
              <PlusIcon data-icon="inline-start" />
              Add criterion
            </Button>

            <p className="text-label-12 text-muted-foreground">
              {isMaxReached ? 'Maximum reached' : `${criteria.length}/${MAX_EVALUATION_CRITERIA}`}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

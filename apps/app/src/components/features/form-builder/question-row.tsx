import { Badge } from '@comitium/ui/badge';
import { Button } from '@comitium/ui/button';
import { ConfirmDialog } from '@comitium/ui/confirm-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@comitium/ui/dropdown-menu';
import { useSortable } from '@dnd-kit/react/sortable';
import { DotsSixVerticalIcon, DotsThreeIcon, PencilIcon, TrashIcon } from '@phosphor-icons/react';
import { memo, useCallback, useState } from 'react';
import { cn } from '@/lib/utils';

import type { FormBuilderQuestion } from './question-form';
import { getQuestionTypeLabel } from './question-type-options';

interface QuestionRowProps {
  question: FormBuilderQuestion;
  index: number;
  canDrag: boolean;
  onEdit: (question: FormBuilderQuestion) => void;
  onDelete: (questionId: string) => void;
  isDeleting: boolean;
}

export const QuestionRow = memo(function QuestionRow({
  question,
  index,
  canDrag,
  onEdit,
  onDelete,
  isDeleting,
}: QuestionRowProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const { ref: rowRef, isDragging } = useSortable({
    id: question.id,
    index,
    disabled: !canDrag,
  });

  const openDelete = useCallback(() => setDeleteDialogOpen(true), []);
  const closeDelete = useCallback(() => setDeleteDialogOpen(false), []);

  const stopPropagation = useCallback((e: React.MouseEvent) => e.stopPropagation(), []);

  const openDeleteWithStop = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      openDelete();
    },
    [openDelete],
  );

  const handleEdit = useCallback(() => onEdit(question), [onEdit, question]);

  const handleDelete = useCallback(() => {
    onDelete(question.id);
    closeDelete();
  }, [onDelete, question.id, closeDelete]);

  return (
    <>
      <div
        ref={rowRef}
        className={cn(
          'group flex items-start justify-between gap-3 px-3 py-3 transition-colors hover:bg-accent cursor-pointer first:pt-2 last:pb-2',
          { 'opacity-50': isDragging },
        )}
        onClick={handleEdit}
      >
        <div className="flex min-w-0 flex-1 items-start gap-2">
          {canDrag && (
            <span
              className="mt-0.5 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors shrink-0"
              onClick={stopPropagation}
            >
              <DotsSixVerticalIcon className="size-4" />
            </span>
          )}

          <div className="min-w-0 flex-1">
            <span className="block truncate text-label-14 text-foreground">{question.prompt}</span>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <Badge variant="secondary">{getQuestionTypeLabel(question.questionType)}</Badge>
              {question.isRequired && <Badge variant="outline">Required</Badge>}
              {question.isPrivate && <Badge variant="outline">Private</Badge>}
            </div>
          </div>
        </div>

        {!question.isLocked && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="size-8 shrink-0 p-0"
                disabled={isDeleting}
                onClick={stopPropagation}
              >
                <DotsThreeIcon />
                <span className="sr-only">Question actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleEdit}>
                <PencilIcon />
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={openDeleteWithStop}>
                <TrashIcon />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete this question?"
        description={
          <>
            <span className="font-medium">&ldquo;{question.prompt}&rdquo;</span> will be removed. This cannot be undone.
          </>
        }
        actionLabel="Delete"
        onConfirm={handleDelete}
        isPending={isDeleting}
        pendingLabel="Deleting…"
      />
    </>
  );
});

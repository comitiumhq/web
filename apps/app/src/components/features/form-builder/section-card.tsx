import type { FormClass } from '@comitium/schemas/forms';
import { Button } from '@comitium/ui/button';
import { Card, CardContent, CardHeader } from '@comitium/ui/card';
import { ConfirmDialog } from '@comitium/ui/confirm-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@comitium/ui/dropdown-menu';
import { Input } from '@comitium/ui/input';
import { type DragDropEventHandlers, DragDropProvider } from '@dnd-kit/react';
import { useSortable } from '@dnd-kit/react/sortable';
import { DotsSixVerticalIcon, DotsThreeIcon, PlusIcon, TrashIcon } from '@phosphor-icons/react';
import { type ReactNode, useCallback, useState } from 'react';
import { cn } from '@/lib/utils';
import { applyDndReorder } from '@/lib/utils/dnd';
import { QuestionEditorSheet, type QuestionEditorState } from './question-editor-sheet';
import type { FormBuilderQuestion, QuestionFormData } from './question-form';
import { QuestionRow } from './question-row';

export interface SectionCardData {
  id: string;
  title: string;
  questions: FormBuilderQuestion[];
}

export interface SectionController {
  onTitleChange: (title: string) => void;
  onDelete: () => void;
  onQuestionCreate: (data: QuestionFormData) => void;
  onQuestionUpdate: (questionId: string, data: QuestionFormData) => void;
  onQuestionDelete: (questionId: string) => void;
  onQuestionReorder: (movedId: string, reordered: FormBuilderQuestion[]) => void;
  isQuestionPending: boolean;
  isSectionUpdating: boolean;
  isSectionDeleting: boolean;
  isQuestionDeleting: boolean;
}

interface SectionCardProps {
  formClass: FormClass;
  section: SectionCardData;
  index: number;
  canDrag: boolean;
  controller: SectionController;
  disableTitle?: boolean;
}

export function SectionCard({
  formClass,
  section,
  index,
  canDrag,
  controller,
  disableTitle = false,
}: SectionCardProps) {
  const { ref: sectionRef, isDragging } = useSortable({
    id: section.id,
    index,
    type: 'section',
    disabled: !canDrag,
  });

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editorState, setEditorState] = useState<QuestionEditorState | null>(null);

  const handleTitleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      controller.onTitleChange(event.target.value);
    },
    [controller],
  );

  const handleTitleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  }, []);

  const openDelete = useCallback(() => setDeleteDialogOpen(true), []);
  const closeDelete = useCallback(() => setDeleteDialogOpen(false), []);

  const handleDelete = useCallback(() => {
    controller.onDelete();
    closeDelete();
  }, [controller, closeDelete]);

  const openCreateQuestion = useCallback(() => setEditorState({ mode: 'create' }), []);
  const openEditQuestion = useCallback((question: FormBuilderQuestion) => {
    setEditorState({ mode: 'edit', question });
  }, []);
  const closeEditor = useCallback(() => setEditorState(null), []);

  const handleEditorSubmit = useCallback(
    (data: QuestionFormData) => {
      if (!editorState) {
        return;
      }

      if (editorState.mode === 'create') {
        controller.onQuestionCreate(data);
      } else {
        controller.onQuestionUpdate(editorState.question.id, data);
      }

      closeEditor();
    },
    [editorState, controller, closeEditor],
  );

  const handleQuestionDelete = useCallback(
    (questionId: string) => {
      controller.onQuestionDelete(questionId);
    },
    [controller],
  );

  const handleQuestionDragEnd = useCallback<DragDropEventHandlers['onDragEnd']>(
    (event) => {
      if (event.canceled) {
        return;
      }

      const { source, target } = event.operation;
      const reordered = applyDndReorder(section.questions, (q) => q.id, source, target);

      if (!reordered || !source) {
        return;
      }

      controller.onQuestionReorder(String(source.id), reordered);
    },
    [section.questions, controller],
  );

  const canDragQuestions = section.questions.length > 1;
  const hasLockedQuestion = section.questions.some((q) => q.isLocked);
  const questionRows = section.questions.map((q, i) => (
    <QuestionRow
      key={q.id}
      question={q}
      index={i}
      canDrag={canDragQuestions}
      onEdit={openEditQuestion}
      onDelete={handleQuestionDelete}
      isDeleting={controller.isQuestionDeleting}
    />
  ));
  let questionsContent: ReactNode;

  if (section.questions.length === 0) {
    questionsContent = (
      <p className="text-copy-14 text-muted-foreground rounded-xl bg-muted/50 px-3 py-4">No questions yet.</p>
    );
  } else if (canDragQuestions) {
    questionsContent = (
      <DragDropProvider onDragEnd={handleQuestionDragEnd}>
        <div className="flex flex-col divide-y divide-border">{questionRows}</div>
      </DragDropProvider>
    );
  } else {
    questionsContent = <div className="flex flex-col divide-y divide-border">{questionRows}</div>;
  }

  return (
    <>
      <Card ref={sectionRef} size="sm" className={cn('gap-0 py-0 transition-opacity', { 'opacity-50': isDragging })}>
        <CardHeader className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3">
          <div className="flex items-center gap-1 flex-1 min-w-0">
            {canDrag && (
              <span className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors shrink-0">
                <DotsSixVerticalIcon className="size-4" />
              </span>
            )}
            <div className="min-w-0 flex-1">
              <Input
                value={section.title}
                onChange={handleTitleChange}
                onKeyDown={handleTitleKeyDown}
                disabled={controller.isSectionUpdating || disableTitle}
                aria-label={disableTitle ? 'Section title' : 'Section title (optional)'}
                placeholder="Add section title (optional)"
                className="text-heading-16 bg-transparent border-none shadow-none px-0 focus-visible:ring-0 placeholder:text-muted-foreground"
              />
            </div>
          </div>

          {!hasLockedQuestion && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="size-8 shrink-0 p-0"
                  disabled={controller.isSectionDeleting}
                >
                  <DotsThreeIcon />
                  <span className="sr-only">Section actions</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem variant="destructive" onClick={openDelete}>
                  <TrashIcon />
                  Delete section
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </CardHeader>

        <CardContent className="flex flex-col gap-2 px-4 pb-4">
          {questionsContent}

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="self-start text-muted-foreground"
            onClick={openCreateQuestion}
          >
            <PlusIcon data-icon="inline-start" />
            Add question
          </Button>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete this section?"
        description={
          section.title ? (
            <>
              <span className="font-medium">&ldquo;{section.title}&rdquo;</span> and all its questions will be removed.
              This cannot be undone.
            </>
          ) : (
            'This section and all its questions will be removed. This cannot be undone.'
          )
        }
        actionLabel="Delete section"
        onConfirm={handleDelete}
        isPending={controller.isSectionDeleting}
        pendingLabel="Deleting…"
      />

      <QuestionEditorSheet
        formClass={formClass}
        state={editorState}
        onClose={closeEditor}
        onSubmit={handleEditorSubmit}
        isPending={controller.isQuestionPending}
      />
    </>
  );
}

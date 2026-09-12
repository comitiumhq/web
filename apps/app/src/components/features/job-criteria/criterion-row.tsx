import type { EvaluationCriterion } from '@comitium/schemas/jobs';
import { Button } from '@comitium/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@comitium/ui/collapsible';
import { ConfirmDialog } from '@comitium/ui/confirm-dialog';
import { Input } from '@comitium/ui/input';
import { Textarea } from '@comitium/ui/textarea';
import { useSortable } from '@dnd-kit/react/sortable';
import { CaretDownIcon, DotsSixVerticalIcon, TrashIcon } from '@phosphor-icons/react';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import {
  MAX_EVALUATION_CRITERION_PROMPT_LENGTH,
  MAX_EVALUATION_CRITERION_TITLE_LENGTH,
} from '@/lib/jobs/evaluation-criteria';
import { cn } from '@/lib/utils';

interface CriterionRowProps {
  id: string;
  index: number;
  criterion: EvaluationCriterion;
  isExpanded: boolean;
  onToggle: (id: string) => void;
  onUpdate: (id: string, field: 'title' | 'prompt', value: string) => void;
  onRemove: (id: string) => void;
}

export const CriterionRow = memo(function CriterionRow({
  id,
  index,
  criterion,
  isExpanded,
  onToggle,
  onUpdate,
  onRemove,
}: CriterionRowProps) {
  const titleRef = useRef<HTMLInputElement>(null);
  const { ref, handleRef, isDragging } = useSortable({ id, index });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const isFilled = criterion.title.trim().length > 0;

  const titleId = `criterion-${id}-title`;
  const promptId = `criterion-${id}-prompt`;

  useEffect(() => {
    if (isExpanded) {
      titleRef.current?.focus();
    }
  }, [isExpanded]);

  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onUpdate(id, 'title', e.target.value);
    },
    [id, onUpdate],
  );

  const handlePromptChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onUpdate(id, 'prompt', e.target.value);
    },
    [id, onUpdate],
  );

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (open !== isExpanded) {
        onToggle(id);
      }
    },
    [id, isExpanded, onToggle],
  );

  const handleDeleteRequest = useCallback(() => {
    setConfirmOpen(true);
  }, []);

  const handleDeleteConfirm = useCallback(() => {
    onRemove(id);
    setConfirmOpen(false);
  }, [id, onRemove]);

  return (
    <Collapsible
      ref={ref}
      open={isExpanded}
      onOpenChange={handleOpenChange}
      className={cn(
        'group/criterion overflow-hidden rounded-xl border border-border bg-card bg-clip-padding transition-[border-color,opacity] duration-150 ease-out motion-reduce:transition-none',
        {
          'hover:border-input': !isExpanded && !isDragging,
          'border-input': isExpanded && !isDragging,
          'z-50 cursor-grabbing border-primary/35 opacity-95 shadow-xl ring-1 ring-primary/20': isDragging,
        },
      )}
    >
      <div className="flex items-center transition-colors hover:bg-foreground/[0.025]">
        <span
          ref={handleRef}
          className="flex shrink-0 cursor-grab items-center self-stretch pl-2 pr-1 text-muted-foreground transition-colors hover:text-foreground active:cursor-grabbing"
        >
          <DotsSixVerticalIcon className="size-4" />
        </span>

        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex flex-1 items-center gap-3 py-3 pl-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-inset"
          >
            <span
              className={cn(
                'flex size-5 shrink-0 items-center justify-center rounded-full bg-foreground/6 text-label-12 tabular-nums text-muted-foreground transition-colors',
                { 'bg-foreground/10 text-foreground/80': isExpanded },
              )}
            >
              {index + 1}
            </span>

            <span className={cn('flex-1 truncate text-label-14 font-medium', { 'text-muted-foreground': !isFilled })}>
              {isFilled ? criterion.title : 'Untitled criterion'}
            </span>

            <CaretDownIcon
              className={cn(
                'size-4 shrink-0 text-muted-foreground transition-transform duration-150 motion-reduce:transition-none',
                {
                  'rotate-180': isExpanded,
                },
              )}
            />
          </button>
        </CollapsibleTrigger>

        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Delete criterion"
          className="mx-1 shrink-0 text-muted-foreground transition-[color,background-color,opacity] hover:bg-destructive/10 hover:text-destructive-text focus-visible:opacity-100 md:opacity-0 md:group-hover/criterion:opacity-100 md:group-focus-within/criterion:opacity-100"
          onClick={handleDeleteRequest}
        >
          <TrashIcon />
        </Button>
      </div>

      <CollapsibleContent className="overflow-hidden [--radix-accordion-content-height:var(--radix-collapsible-content-height)] [animation-duration:180ms]! [animation-timing-function:cubic-bezier(0.4,0,0.2,1)]! data-closed:animate-accordion-up data-open:animate-accordion-down motion-reduce:animate-none!">
        <div className="flex flex-col gap-4 px-3.5 pb-3.5 pt-1">
          <div className="flex flex-col gap-2">
            <label htmlFor={titleId} className="text-label-14">
              Title
            </label>
            <Input
              id={titleId}
              ref={titleRef}
              value={criterion.title}
              onChange={handleTitleChange}
              placeholder="e.g. React experience"
              maxLength={MAX_EVALUATION_CRITERION_TITLE_LENGTH}
            />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <label htmlFor={promptId} className="text-label-14">
                Evaluation prompt
              </label>
              <span className="text-label-12 tabular-nums text-muted-foreground">
                {criterion.prompt.length}/{MAX_EVALUATION_CRITERION_PROMPT_LENGTH}
              </span>
            </div>
            <Textarea
              id={promptId}
              value={criterion.prompt}
              onChange={handlePromptChange}
              placeholder="e.g. Has 3+ years building production React apps with hooks and TypeScript"
              maxLength={MAX_EVALUATION_CRITERION_PROMPT_LENGTH}
              rows={5}
              className="min-h-32 resize-none"
            />
          </div>
        </div>
      </CollapsibleContent>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete this criterion?"
        description={
          isFilled ? (
            <>
              <span className="font-medium">&ldquo;{criterion.title}&rdquo;</span> will be removed. This cannot be
              undone.
            </>
          ) : (
            'This criterion will be removed. This cannot be undone.'
          )
        }
        actionLabel="Delete"
        onConfirm={handleDeleteConfirm}
      />
    </Collapsible>
  );
});

import { Badge } from '@comitium/ui/badge';
import { Button } from '@comitium/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@comitium/ui/dialog';
import { Input } from '@comitium/ui/input';
import { CheckIcon, MagnifyingGlassIcon } from '@phosphor-icons/react';
import { type ChangeEvent, memo, useCallback, useMemo, useState } from 'react';
import type { InterviewPlanSummary } from '@/lib/schemas/pipeline';
import { cn } from '@/lib/utils';

interface PlanPickerDialogProps {
  plans: InterviewPlanSummary[];
  selectedPlanId: string | null;
  disabled: boolean;
  onSelect: (planId: string) => void;
}

export const PlanPickerDialog = memo(function PlanPickerDialog({
  plans,
  selectedPlanId,
  disabled,
  onSelect,
}: PlanPickerDialogProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const filteredPlans = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();

    if (!normalizedQuery) {
      return plans;
    }

    return plans.filter((plan) => plan.name.toLocaleLowerCase().includes(normalizedQuery));
  }, [plans, query]);

  const handleOpenChange = useCallback((nextOpen: boolean) => {
    setOpen(nextOpen);

    if (!nextOpen) {
      setQuery('');
    }
  }, []);

  const handleQueryChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setQuery(event.target.value);
  }, []);

  const handleSelect = useCallback(
    (planId: string) => {
      onSelect(planId);
      setOpen(false);
      setQuery('');
    },
    [onSelect],
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" disabled={disabled}>
          {selectedPlanId === null ? 'Select plan' : 'Change plan'}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Select interview plan</DialogTitle>
          <DialogDescription className="sr-only">Available interview plans</DialogDescription>
        </DialogHeader>

        <div className="relative">
          <MagnifyingGlassIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={handleQueryChange}
            placeholder="Search interview plans"
            className="pl-9"
            autoFocus
          />
        </div>

        <div className="max-h-[min(28rem,55vh)] overflow-y-auto pr-1">
          {filteredPlans.length > 0 ? (
            <div className="flex flex-col gap-2">
              {filteredPlans.map((plan) => (
                <PlanOption key={plan.id} plan={plan} selected={plan.id === selectedPlanId} onSelect={handleSelect} />
              ))}
            </div>
          ) : (
            <p className="py-10 text-center text-copy-14 text-muted-foreground">No interview plans found</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
});

interface PlanOptionProps {
  plan: InterviewPlanSummary;
  selected: boolean;
  onSelect: (planId: string) => void;
}

const PlanOption = memo(function PlanOption({ plan, selected, onSelect }: PlanOptionProps) {
  const handleClick = useCallback(() => {
    onSelect(plan.id);
  }, [onSelect, plan.id]);

  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={handleClick}
      className={cn(
        'flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
        { 'border-primary bg-primary/5': selected },
      )}
    >
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate text-label-14 font-medium">{plan.name}</span>
          {plan.isDefault ? <Badge variant="secondary">Default</Badge> : null}
        </span>
        <span className="mt-0.5 block text-label-12 text-muted-foreground">
          {plan.stageCount} {plan.stageCount === 1 ? 'stage' : 'stages'}
        </span>
        {plan.stageNames.length > 0 ? (
          <span className="mt-2 block truncate text-copy-13 text-muted-foreground">{plan.stageNames.join(' · ')}</span>
        ) : null}
      </span>
      <span
        className={cn('flex size-5 shrink-0 items-center justify-center rounded-full border-2', {
          'border-muted-foreground/30': !selected,
          'border-primary bg-primary text-primary-foreground': selected,
        })}
        aria-hidden="true"
      >
        {selected ? <CheckIcon className="size-3" /> : null}
      </span>
    </button>
  );
});

import { Label } from '@comitium/ui/label';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@comitium/ui/select';
import { Textarea } from '@comitium/ui/textarea';
import { useCallback } from 'react';

import { CATEGORY_ORDER, NOTE_MAX_LENGTH } from './constants';
import { REASON_CATEGORY_LABELS } from './labels';
import type { ReasonPickerState } from './use-reason-picker-state';

interface ReasonPickerProps {
  state: ReasonPickerState;
  disabled?: boolean;
  idPrefix: string;
}

export function ReasonPicker({ state, disabled, idPrefix }: ReasonPickerProps) {
  const reasonInputId = `${idPrefix}-reason`;
  const noteInputId = `${idPrefix}-note`;

  return (
    <div className="flex flex-col gap-4">
      {state.showSelect && <ReasonSelectField state={state} disabled={disabled} id={reasonInputId} />}
      <NoteField state={state} id={noteInputId} />
    </div>
  );
}

interface ReasonSelectFieldProps {
  state: ReasonPickerState;
  disabled: boolean | undefined;
  id: string;
}

function ReasonSelectField({ state, disabled, id }: ReasonSelectFieldProps) {
  const placeholder = state.isLoading ? 'Loading…' : 'Select a reason';
  const labelText = state.reasonRequired ? 'Reason' : 'Reason (optional)';

  const visibleCategories = CATEGORY_ORDER.filter((c) => state.groupedReasons[c].length > 0);

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{labelText}</Label>
      <Select value={state.reasonId} onValueChange={state.setReasonId} disabled={disabled}>
        <SelectTrigger id={id} aria-invalid={state.reasonError} className="w-full">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
          {visibleCategories.map((category, index) => (
            <ReasonCategoryGroup
              key={category}
              category={category}
              reasons={state.groupedReasons[category]}
              showSeparator={index > 0}
            />
          ))}
        </SelectContent>
      </Select>
      {state.reasonError && <p className="text-label-12 text-destructive">Please select a reason</p>}
    </div>
  );
}

interface ReasonCategoryGroupProps {
  category: keyof typeof REASON_CATEGORY_LABELS;
  reasons: { id: string; label: string }[];
  showSeparator: boolean;
}

function ReasonCategoryGroup({ category, reasons, showSeparator }: ReasonCategoryGroupProps) {
  return (
    <>
      {showSeparator && <SelectSeparator />}
      <SelectGroup>
        <SelectLabel className="text-label-11 font-semibold uppercase tracking-wider text-muted-foreground px-2 pt-2 pb-1">
          {REASON_CATEGORY_LABELS[category]}
        </SelectLabel>
        {reasons.map((r) => (
          <SelectItem key={r.id} value={r.id} className="pl-2">
            {r.label}
          </SelectItem>
        ))}
      </SelectGroup>
    </>
  );
}

function NoteField({ state, id }: { state: ReasonPickerState; id: string }) {
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => state.setNote(e.target.value),
    [state],
  );

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>Internal note (optional)</Label>
      <Textarea
        id={id}
        value={state.note}
        onChange={handleChange}
        placeholder="Visible only to your team"
        maxLength={NOTE_MAX_LENGTH}
        rows={3}
      />
    </div>
  );
}

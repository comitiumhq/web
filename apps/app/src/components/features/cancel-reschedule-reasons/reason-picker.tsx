import { Combobox } from '@comitium/ui/combobox';
import { Label } from '@comitium/ui/label';
import { Textarea } from '@comitium/ui/textarea';
import { useCallback, useMemo } from 'react';

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

  const options = useMemo(
    () =>
      CATEGORY_ORDER.flatMap((category) =>
        state.groupedReasons[category].map((reason) => ({
          value: reason.id,
          label: reason.label,
          group: REASON_CATEGORY_LABELS[category],
        })),
      ),
    [state.groupedReasons],
  );

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{labelText}</Label>
      <Combobox
        id={id}
        ariaLabel={labelText}
        aria-invalid={state.reasonError}
        options={options}
        value={state.reasonId || null}
        onValueChange={(nextValue) => state.setReasonId(nextValue ?? '')}
        placeholder={placeholder}
        searchPlaceholder="Search reasons…"
        emptyMessage="No matching reasons found."
        disabled={disabled}
      />
      {state.reasonError && <p className="text-label-12 text-destructive">Please select a reason</p>}
    </div>
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

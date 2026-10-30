import { Button } from '@comitium/ui/button';
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@comitium/ui/sheet';
import { RotateCcwIcon } from 'lucide-react';
import { useState } from 'react';
import { CandidateFilterFields } from './filter-fields';
import type { CandidateFilter } from './filters';

interface CandidateFilterPanelProps {
  orgId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: CandidateFilter[];
  onApply: (filters: CandidateFilter[]) => void;
}

interface CandidateFilterFormProps {
  orgId: string;
  filters: CandidateFilter[];
  onApply: (filters: CandidateFilter[]) => void;
  onCancel: () => void;
}

function CandidateFilterForm({ orgId, filters, onApply, onCancel }: CandidateFilterFormProps) {
  const [draft, setDraft] = useState(filters);

  return (
    <form
      className="flex min-h-0 flex-1 flex-col"
      onSubmit={(event) => {
        event.preventDefault();
        onApply(draft);
      }}
    >
      <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6">
        <CandidateFilterFields orgId={orgId} filters={draft} onChange={setDraft} />
      </div>
      <SheetFooter className="flex-row items-center justify-between border-t border-separator px-6 py-3">
        <Button type="button" variant="ghost" size="sm" disabled={draft.length === 0} onClick={() => setDraft([])}>
          <RotateCcwIcon />
          Reset
        </Button>
        <div className="flex items-center gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" size="sm">
            Apply
          </Button>
        </div>
      </SheetFooter>
    </form>
  );
}

export function CandidateFilterPanel({ orgId, open, onOpenChange, filters, onApply }: CandidateFilterPanelProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="gap-0" aria-describedby={undefined}>
        <SheetHeader>
          <SheetTitle>Filters</SheetTitle>
        </SheetHeader>
        {open && (
          <CandidateFilterForm
            orgId={orgId}
            filters={filters}
            onApply={(next) => {
              onApply(next);
              onOpenChange(false);
            }}
            onCancel={() => onOpenChange(false)}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

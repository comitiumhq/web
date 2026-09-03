import type { FormClass } from '@comitium/schemas/forms';
import { FeatureSheetContent, FeatureSheetHeader } from '@comitium/ui/feature-sheet';
import { Sheet, SheetDescription, SheetTitle } from '@comitium/ui/sheet';
import { useCallback, useRef } from 'react';

import { FormEditor } from './form-editor';

interface FormEditSheetProps {
  orgId: string;
  formClass: FormClass;
  isCreating: boolean;
  selectedFormId: string | null;
  onSaved: (formId: string) => void;
  onClose: () => void;
}

const SHEET_COPY: Partial<Record<FormClass, { newTitle: string; editTitle: string; description: string }>> = {
  application: {
    newTitle: 'New application form',
    editTitle: 'Application form',
    description: 'Candidate-facing questions used to collect structured application details.',
  },
  feedback: {
    newTitle: 'New feedback form',
    editTitle: 'Feedback form',
    description: 'Questions interviewers answer when submitting structured candidate feedback.',
  },
};

const DEFAULT_SHEET_COPY = {
  newTitle: 'New form',
  editTitle: 'Form',
  description: 'Reusable form template.',
};

export function FormEditSheet({ orgId, formClass, isCreating, selectedFormId, onSaved, onClose }: FormEditSheetProps) {
  const open = isCreating || selectedFormId !== null;
  const lastModeRef = useRef<'new' | 'edit' | null>(null);
  const lastFormIdRef = useRef<string | null>(null);
  const liveMode = resolveLiveMode(isCreating, selectedFormId);

  if (liveMode) {
    lastModeRef.current = liveMode;
  }

  if (selectedFormId !== null) {
    lastFormIdRef.current = selectedFormId;
  }

  const displayMode = open ? liveMode : lastModeRef.current;
  const displayFormId = open && selectedFormId !== null ? selectedFormId : lastFormIdRef.current;
  const copy = SHEET_COPY[formClass] ?? DEFAULT_SHEET_COPY;

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) {
        onClose();
      }
    },
    [onClose],
  );

  if (!displayMode) {
    return null;
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <FeatureSheetContent width="2xl">
        <FeatureSheetHeader>
          <SheetTitle className="text-heading-20">{displayMode === 'new' ? copy.newTitle : copy.editTitle}</SheetTitle>
          <SheetDescription>{copy.description}</SheetDescription>
        </FeatureSheetHeader>

        <FormEditor
          key={displayFormId ?? 'new'}
          orgId={orgId}
          formClass={formClass}
          formId={displayMode === 'edit' ? displayFormId : null}
          onSaved={onSaved}
          onClose={onClose}
        />
      </FeatureSheetContent>
    </Sheet>
  );
}

function resolveLiveMode(isCreating: boolean, selectedFormId: string | null): 'new' | 'edit' | null {
  if (isCreating) {
    return 'new';
  }

  if (selectedFormId !== null) {
    return 'edit';
  }

  return null;
}

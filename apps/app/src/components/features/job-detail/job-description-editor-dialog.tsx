import type { TipTapDoc } from '@comitium/schemas/common';
import { Button } from '@comitium/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@comitium/ui/dialog';
import { richTextToPlainText } from '@comitium/ui/rich-text';
import { useCallback, useEffect, useRef, useState } from 'react';
import { DescriptionToolbar } from '@/components/tiptap-ui/editor-toolbars';
import { RichTextEditor, type RichTextEditorHandle } from '@/components/tiptap-ui/rich-text-editor';

const EMPTY_DESCRIPTION: TipTapDoc = { type: 'doc', content: [{ type: 'paragraph' }] };

interface JobDescriptionEditorDialogProps {
  description: TipTapDoc | null;
  isPending: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (description: TipTapDoc) => Promise<unknown>;
}

export function JobDescriptionEditorDialog({
  description,
  isPending,
  open,
  onOpenChange,
  onSave,
}: JobDescriptionEditorDialogProps) {
  const editorRef = useRef<RichTextEditorHandle | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const initialDoc = description ?? EMPTY_DESCRIPTION;

  useEffect(() => {
    if (open) {
      setIsDirty(false);
    }
  }, [open]);

  const handleSubmit = useCallback(async () => {
    const nextDescription = editorRef.current?.getJSON();

    if (isPending || !nextDescription || !richTextToPlainText(nextDescription)) {
      onOpenChange(false);

      return;
    }

    try {
      await onSave(nextDescription);
      onOpenChange(false);
    } catch {
      return;
    }
  }, [isPending, onOpenChange, onSave]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit description</DialogTitle>
          <DialogDescription>The public description candidates see.</DialogDescription>
        </DialogHeader>

        <RichTextEditor
          content={initialDoc}
          handleRef={editorRef}
          onUpdate={() => setIsDirty(true)}
          toolbar={<DescriptionToolbar />}
          minHeightClass="min-h-80"
        />

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isPending || !isDirty}>
            {isPending ? 'Saving…' : 'Save changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

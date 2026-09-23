import type { TipTapDoc } from '@comitium/schemas/common';
import { Button } from '@comitium/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@comitium/ui/dialog';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DescriptionToolbar } from '@/components/tiptap-ui/editor-toolbars';
import { RichTextEditor, type RichTextEditorHandle } from '@/components/tiptap-ui/rich-text-editor';
import { parseJobDescription, serializeJobDescription } from '@/lib/jobs/description';

interface JobDescriptionEditorDialogProps {
  descriptionMarkdown: string | null;
  isPending: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (description: TipTapDoc, descriptionMarkdown: string) => Promise<unknown>;
}

export function JobDescriptionEditorDialog({
  descriptionMarkdown,
  isPending,
  open,
  onOpenChange,
  onSave,
}: JobDescriptionEditorDialogProps) {
  const editorRef = useRef<RichTextEditorHandle | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const initialMarkdown = (descriptionMarkdown ?? '').trim();
  const initialDoc = useMemo(() => parseJobDescription(descriptionMarkdown), [descriptionMarkdown]);

  useEffect(() => {
    if (open) {
      setIsDirty(false);
    }
  }, [open]);

  const handleSubmit = useCallback(async () => {
    const description = editorRef.current?.getJSON();
    const nextMarkdown = serializeJobDescription(description ?? null);

    if (isPending || !description || !nextMarkdown || nextMarkdown === initialMarkdown) {
      onOpenChange(false);

      return;
    }

    try {
      await onSave(description, nextMarkdown);
      onOpenChange(false);
    } catch {
      return;
    }
  }, [initialMarkdown, isPending, onOpenChange, onSave]);

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

import type { TipTapDoc } from '@comitium/schemas/common';
import { Button } from '@comitium/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@comitium/ui/dialog';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DescriptionToolbar } from '@/components/tiptap-ui/editor-toolbars';
import { RichTextEditor, type RichTextEditorHandle } from '@/components/tiptap-ui/rich-text-editor';
import { markdownManager } from '@/lib/tiptap/extensions';

interface JobDescriptionEditorDialogProps {
  descriptionMarkdown: string | null;
  isPending: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (description: TipTapDoc, descriptionMarkdown: string) => Promise<unknown>;
}

const EMPTY_DESCRIPTION: TipTapDoc = { type: 'doc', content: [{ type: 'paragraph' }] };

function parseDescription(markdown: string | null): TipTapDoc {
  if (!markdown) {
    return EMPTY_DESCRIPTION;
  }

  try {
    return markdownManager.parse(markdown) as TipTapDoc;
  } catch {
    return EMPTY_DESCRIPTION;
  }
}

function serializeDescription(doc: TipTapDoc): string {
  try {
    return markdownManager.serialize(doc).trim();
  } catch {
    return '';
  }
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
  const initialDoc = useMemo(() => parseDescription(descriptionMarkdown), [descriptionMarkdown]);

  useEffect(() => {
    if (open) {
      setIsDirty(false);
    }
  }, [open]);

  const handleSubmit = useCallback(async () => {
    const description = editorRef.current?.getJSON();
    const nextMarkdown = description ? serializeDescription(description) : '';

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

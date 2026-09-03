import type { TipTapDoc } from '@comitium/schemas/common';
import type { JobSummary } from '@comitium/schemas/jobs';
import { Button } from '@comitium/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@comitium/ui/dialog';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DescriptionToolbar } from '@/components/tiptap-ui/editor-toolbars';
import { RichTextEditor, type RichTextEditorHandle } from '@/components/tiptap-ui/rich-text-editor';
import { useUpdateJobContentUri } from '@/hooks/mutations/use-update-job-content-uri';
import { markdownManager } from '@/lib/tiptap/extensions';

interface EditJobDescriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string;
  job: JobSummary;
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

export function EditJobDescriptionDialog({ open, onOpenChange, orgId, job }: EditJobDescriptionDialogProps) {
  const editorRef = useRef<RichTextEditorHandle | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const { mutateAsync: updateDescription, isPending } = useUpdateJobContentUri();

  const initialMarkdown = (job.description ?? '').trim();
  const initialDoc = useMemo(() => parseDescription(job.description), [job.description]);

  useEffect(() => {
    if (open) {
      setIsDirty(false);
    }
  }, [open]);

  const handleUpdate = useCallback(() => {
    setIsDirty(true);
  }, []);

  const handleCancel = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  const handleSubmit = useCallback(async () => {
    const doc = editorRef.current?.getJSON();
    const descriptionMarkdown = doc ? serializeDescription(doc) : '';

    if (isPending || !descriptionMarkdown || descriptionMarkdown === initialMarkdown) {
      onOpenChange(false);

      return;
    }

    await updateDescription({
      orgId,
      jobId: job.id,
      expectedVersion: job.version,
      descriptionMarkdown,
    });

    onOpenChange(false);
  }, [initialMarkdown, isPending, job.id, job.version, onOpenChange, orgId, updateDescription]);

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
          onUpdate={handleUpdate}
          toolbar={<DescriptionToolbar />}
          minHeightClass="min-h-80"
        />

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={isPending}>
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

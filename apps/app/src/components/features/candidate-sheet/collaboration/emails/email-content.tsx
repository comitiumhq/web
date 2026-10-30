import { ExpandableContent } from '@comitium/ui/expandable-content';
import { isString } from '@tiptap/react';
import { RichTextEditor } from '@/components/tiptap-ui/rich-text-editor';
import type { DecryptedEmailContent } from '@/lib/schemas/emails';

interface EmailContentProps {
  body: DecryptedEmailContent['body'];
  collapsedLines: number;
}

export function EmailContent({ body, collapsedLines }: EmailContentProps) {
  if (!isString(body)) {
    return (
      <ExpandableContent collapsedLines={collapsedLines}>
        <RichTextEditor content={body} readOnly />
      </ExpandableContent>
    );
  }

  return (
    <ExpandableContent collapsedLines={collapsedLines} contentClassName="whitespace-pre-wrap break-words">
      {body}
    </ExpandableContent>
  );
}

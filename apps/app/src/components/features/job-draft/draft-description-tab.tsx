import type { TipTapDoc } from '@comitium/schemas/common';
import { memo } from 'react';
import { DescriptionToolbar } from '@/components/tiptap-ui/editor-toolbars';
import { RichTextEditor } from '@/components/tiptap-ui/rich-text-editor';

interface DraftDescriptionTabProps {
  content: TipTapDoc | null;
  onChange: (content: TipTapDoc) => void;
}

export const DraftDescriptionTab = memo(function DraftDescriptionTab({ content, onChange }: DraftDescriptionTabProps) {
  return (
    <RichTextEditor
      content={content}
      onUpdate={onChange}
      toolbar={<DescriptionToolbar />}
      placeholder=""
      debounceMs={0}
      minHeightClass="min-h-100"
    />
  );
});

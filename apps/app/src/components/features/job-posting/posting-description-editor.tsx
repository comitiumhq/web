import type { TipTapDoc } from '@comitium/schemas/common';
import { memo } from 'react';
import { DescriptionToolbar } from '@/components/tiptap-ui/editor-toolbars';
import { RichTextEditor } from '@/components/tiptap-ui/rich-text-editor';

interface PostingDescriptionEditorProps {
  content: TipTapDoc | null;
  onChange?: (content: TipTapDoc) => void;
  readOnly?: boolean;
  disabled?: boolean;
}

export const PostingDescriptionEditor = memo(function PostingDescriptionEditor({
  content,
  onChange,
  readOnly = false,
  disabled = false,
}: PostingDescriptionEditorProps) {
  return (
    <RichTextEditor
      content={content}
      onUpdate={onChange}
      toolbar={readOnly ? undefined : <DescriptionToolbar />}
      placeholder=""
      debounceMs={0}
      minHeightClass="min-h-100"
      readOnly={readOnly}
      disabled={disabled}
    />
  );
});

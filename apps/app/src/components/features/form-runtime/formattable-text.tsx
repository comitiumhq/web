import type { FormattableTextDisplayProps, FormattableTextInputProps } from '@comitium/ui/forms';
import { DescriptionToolbar } from '@/components/tiptap-ui/editor-toolbars';
import { RichTextEditor } from '@/components/tiptap-ui/rich-text-editor';
import { tipTapToPlainText } from '@/lib/tiptap/tokens';

export function AppFormattableTextInput({ value, placeholder, onBlur, onChange }: FormattableTextInputProps) {
  return (
    <div onBlur={onBlur}>
      <RichTextEditor
        content={value || null}
        placeholder={placeholder}
        toolbar={<DescriptionToolbar />}
        compact
        debounceMs={0}
        minHeightClass="min-h-32 max-h-72 overflow-y-auto"
        onUpdate={(doc, html) => onChange(tipTapToPlainText(doc).trim() ? html : '')}
      />
    </div>
  );
}

export function AppFormattableTextDisplay({ value }: FormattableTextDisplayProps) {
  return <RichTextEditor content={value} readOnly />;
}

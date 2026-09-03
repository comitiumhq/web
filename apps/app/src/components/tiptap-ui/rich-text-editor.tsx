import type { TipTapDoc } from '@comitium/schemas/common';
import Placeholder from '@tiptap/extension-placeholder';
import type { Node } from '@tiptap/pm/model';
import { type Editor, EditorContent, EditorContext, useEditor } from '@tiptap/react';
import { memo, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import { EDITOR_EXTENSIONS } from '@/lib/tiptap/extensions';
import { tipTapToPlainText } from '@/lib/tiptap/tokens';
import { cn } from '@/lib/utils';

export const EMPTY_DOC: TipTapDoc = {
  type: 'doc',
  content: [{ type: 'paragraph' }],
};

export interface RichTextEditorHandle {
  getJSON: () => TipTapDoc;
  getHTML: () => string;
  getText: () => string;
  isEmpty: () => boolean;
  clear: () => void;
}

interface RichTextEditorProps {
  content: TipTapDoc | string | null;
  handleRef?: React.RefObject<RichTextEditorHandle | null>;
  readOnly?: boolean;
  placeholder?: string | ((params: { node: Node; pos: number; editor: Editor }) => string);
  showAllPlaceholders?: boolean;
  disabled?: boolean;
  compact?: boolean;
  onUpdate?: (doc: TipTapDoc, html: string) => void;
  debounceMs?: number;
  minHeightClass?: string;
  toolbar?: React.ReactNode;
}

export const RichTextEditor = memo(function RichTextEditor({
  content,
  handleRef,
  readOnly = false,
  placeholder = 'Compose your message...',
  showAllPlaceholders = false,
  disabled = false,
  compact = false,
  onUpdate,
  debounceMs = 300,
  minHeightClass,
  toolbar,
}: RichTextEditorProps) {
  const placeholderFn = typeof placeholder === 'function' ? placeholder : () => placeholder;

  const extensions = useMemo(
    () => [
      ...EDITOR_EXTENSIONS,
      Placeholder.configure({
        placeholder: placeholderFn,
        showOnlyCurrent: !showAllPlaceholders,
      }),
    ],
    [placeholder, showAllPlaceholders],
  );

  const onUpdateRef = useRef(onUpdate);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const isReadyRef = useRef(false);
  const lastContentRef = useRef(content);

  onUpdateRef.current = onUpdate;

  const editor = useEditor({
    extensions,
    content: content ?? EMPTY_DOC,
    editable: !readOnly && !disabled,
    immediatelyRender: false,
    shouldRerenderOnTransaction: false,
    onCreate() {
      isReadyRef.current = true;
    },
    onTransaction({ editor: ed, transaction }) {
      if (!isReadyRef.current || !transaction.docChanged || !onUpdateRef.current) {
        return;
      }

      if (debounceMs === 0) {
        onUpdateRef.current(ed.getJSON() as TipTapDoc, ed.getHTML());

        return;
      }

      clearTimeout(debounceRef.current);

      debounceRef.current = setTimeout(() => {
        onUpdateRef.current?.(ed.getJSON() as TipTapDoc, ed.getHTML());
      }, debounceMs);
    },
  });

  useEffect(() => {
    return () => clearTimeout(debounceRef.current);
  }, []);

  useEffect(() => {
    if (!editor || onUpdate || content === lastContentRef.current) {
      return;
    }

    lastContentRef.current = content;
    editor.commands.setContent(content ?? EMPTY_DOC);
  }, [editor, content, onUpdate]);

  useEffect(() => {
    if (editor) {
      editor.setEditable(!readOnly && !disabled);
    }
  }, [editor, readOnly, disabled]);

  useImperativeHandle(
    handleRef ?? { current: null },
    () => ({
      getJSON: () => (editor?.getJSON() as TipTapDoc) ?? EMPTY_DOC,
      getHTML: () => editor?.getHTML() ?? '',
      getText: () => tipTapToPlainText((editor?.getJSON() as TipTapDoc) ?? EMPTY_DOC),
      isEmpty: () => editor?.isEmpty ?? true,
      clear: () => editor?.commands.clearContent(),
    }),
    [editor],
  );

  if (!editor) {
    return null;
  }

  const heightClass = minHeightClass ?? (compact ? 'min-h-24 max-h-64 overflow-y-auto' : 'min-h-40');

  return (
    <EditorContext.Provider value={{ editor }}>
      <div
        className={cn({
          'rounded-xl border border-input bg-input/30 transition-colors duration-150': !readOnly,
          'focus-within:border-ring focus-within:ring-1 focus-within:ring-ring/50': !readOnly && !disabled,
          'opacity-50 pointer-events-none': disabled,
        })}
      >
        {!readOnly && toolbar}

        <EditorContent
          editor={editor}
          className={cn(
            'max-w-none text-copy-14',
            {
              '[&_.ProseMirror]:p-0': readOnly,
              'px-5 py-4 cursor-text': !readOnly,
            },
            !readOnly && heightClass,
          )}
          onClick={!readOnly && !disabled ? () => editor.commands.focus() : undefined}
        />
      </div>
    </EditorContext.Provider>
  );
});

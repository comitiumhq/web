import { MinusIcon } from '@phosphor-icons/react';
import { useCallback } from 'react';
import { BlockquoteButton } from '@/components/tiptap-ui/blockquote-button';
import { HeadingDropdownMenu } from '@/components/tiptap-ui/heading-dropdown-menu';
import { LinkPopover } from '@/components/tiptap-ui/link-popover';
import { ListDropdownMenu } from '@/components/tiptap-ui/list-dropdown-menu';
import { MarkButton } from '@/components/tiptap-ui/mark-button';
import { TextAlignButton } from '@/components/tiptap-ui/text-align-button';
import { UndoRedoButton } from '@/components/tiptap-ui/undo-redo-button';
import { Button } from '@/components/tiptap-ui-primitive/button';
import { Separator } from '@/components/tiptap-ui-primitive/separator';
import { useTiptapEditor } from '@/hooks/use-tiptap-editor';

const TOOLBAR_CLASS_NAME =
  'flex min-w-0 items-center gap-0.5 overflow-x-auto border-b border-border px-2 py-1 scrollbar-hide [&>*]:shrink-0';

function HorizontalRuleButton() {
  const { editor } = useTiptapEditor();

  const handleClick = useCallback(() => {
    if (editor) {
      editor.chain().focus().setHorizontalRule().run();
    }
  }, [editor]);

  return (
    <Button type="button" onClick={handleClick} data-style="ghost" aria-label="Insert divider" tooltip="Insert divider">
      <MinusIcon className="tiptap-button-icon" />
    </Button>
  );
}

export function EditorToolbar({ children }: { children?: React.ReactNode }) {
  return (
    <div className={TOOLBAR_CLASS_NAME}>
      <UndoRedoButton action="undo" />
      <UndoRedoButton action="redo" />

      <Separator />

      <HeadingDropdownMenu levels={[2, 3]} />
      <ListDropdownMenu types={['bulletList', 'orderedList']} />
      <BlockquoteButton />
      <HorizontalRuleButton />

      <Separator />

      <MarkButton type="bold" />
      <MarkButton type="italic" />
      <MarkButton type="underline" />

      <Separator />

      <LinkPopover />

      <Separator />

      <TextAlignButton align="left" />
      <TextAlignButton align="center" />
      <TextAlignButton align="right" />

      {children}
    </div>
  );
}

export function DescriptionToolbar({ children }: { children?: React.ReactNode }) {
  return (
    <div className={TOOLBAR_CLASS_NAME}>
      <UndoRedoButton action="undo" />
      <UndoRedoButton action="redo" />

      <Separator />

      <HeadingDropdownMenu levels={[2, 3]} />
      <ListDropdownMenu types={['bulletList', 'orderedList']} />
      <BlockquoteButton />
      <HorizontalRuleButton />

      <Separator />

      <MarkButton type="bold" />
      <MarkButton type="italic" />

      <Separator />

      <LinkPopover />

      {children}
    </div>
  );
}

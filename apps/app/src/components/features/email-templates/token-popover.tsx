import { Popover, PopoverContent, PopoverTrigger } from '@comitium/ui/popover';
import { BracketsCurlyIcon } from '@phosphor-icons/react';
import { memo, useCallback, useState } from 'react';
import { Button } from '@/components/tiptap-ui-primitive/button';
import { useQuerySubstitutionTokens } from '@/hooks/queries/use-query-substitution-tokens';
import { useTiptapEditor } from '@/hooks/use-tiptap-editor';

interface TokenPopoverProps {
  orgId: string;
}

interface TokenOptionProps {
  token: string;
  label: string;
  onInsert: (token: string, label: string) => void;
}

const TokenOption = memo(function TokenOption({ token, label, onInsert }: TokenOptionProps) {
  const handleClick = useCallback(() => {
    onInsert(token, label);
  }, [label, onInsert, token]);

  return (
    <button
      type="button"
      onClick={handleClick}
      className="flex w-full flex-col items-start gap-0.5 rounded-xl px-3 py-1.5 text-left transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
    >
      <span className="text-label-13">{label}</span>
      <code className="font-mono text-label-12 text-muted-foreground">{token}</code>
    </button>
  );
});

export function TokenPopover({ orgId }: TokenPopoverProps) {
  const { editor } = useTiptapEditor();
  const [open, setOpen] = useState(false);
  const { data } = useQuerySubstitutionTokens(orgId, 'email');

  const handleInsert = useCallback(
    (token: string, label: string) => {
      if (!editor) {
        return;
      }

      editor
        .chain()
        .focus()
        .insertContent([
          { type: 'token', attrs: { token, label } },
          { type: 'text', text: ' ' },
        ])
        .run();
      setOpen(false);
    },
    [editor],
  );

  const tokens = data?.data ?? [];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="ghost" tooltip="Insert token" aria-label="Insert token">
          <BracketsCurlyIcon className="tiptap-button-icon" />
          <span className="tiptap-button-text">Insert token</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 gap-0 p-1" align="start">
        {tokens.map((t) => (
          <TokenOption key={t.id} token={t.token} label={t.label} onInsert={handleInsert} />
        ))}
      </PopoverContent>
    </Popover>
  );
}

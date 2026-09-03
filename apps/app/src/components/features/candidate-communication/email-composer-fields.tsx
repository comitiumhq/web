import type { TipTapDoc } from '@comitium/schemas/common';
import { Label } from '@comitium/ui/label';
import { SearchSelect, type SearchSelectOption } from '@comitium/ui/search-select';
import { Skeleton } from '@comitium/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@comitium/ui/tooltip';
import { InfoIcon } from '@phosphor-icons/react';
import type { RefObject } from 'react';
import { EditorToolbar } from '@/components/tiptap-ui/editor-toolbars';
import { RichTextEditor, type RichTextEditorHandle } from '@/components/tiptap-ui/rich-text-editor';

interface EmailTemplateFieldProps {
  options: SearchSelectOption[];
  value: string | null;
  onValueChange: (value: string | null) => void;
  placeholder: string;
  emptyMessage: string;
  label?: string;
  loading?: boolean;
  disabled?: boolean;
  errorMessage?: string;
  portalContainerRef?: RefObject<HTMLElement | null>;
}

export function EmailTemplateField({
  options,
  value,
  onValueChange,
  placeholder,
  emptyMessage,
  label = 'Template',
  loading = false,
  disabled = false,
  errorMessage,
  portalContainerRef,
}: EmailTemplateFieldProps) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {loading ? (
        <Skeleton className="h-9 w-full rounded-4xl" />
      ) : (
        <SearchSelect
          ariaLabel={label}
          options={options}
          value={value}
          onValueChange={onValueChange}
          placeholder={placeholder}
          searchPlaceholder="Search templates..."
          emptyMessage={emptyMessage}
          disabled={disabled}
          portalContainerRef={portalContainerRef}
        />
      )}
      {errorMessage ? <p className="text-copy-12 text-muted-foreground">{errorMessage}</p> : null}
    </div>
  );
}

interface EmailMessageFieldProps {
  content: TipTapDoc | null;
  handleRef: RefObject<RichTextEditorHandle | null>;
  disabled?: boolean;
  editorKey?: string;
  helpText?: string;
}

export function EmailMessageField({ content, handleRef, disabled, editorKey, helpText }: EmailMessageFieldProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <Label>Message</Label>
        {helpText ? <EmailMessageHelp text={helpText} /> : null}
      </div>
      <RichTextEditor
        key={editorKey}
        content={content}
        handleRef={handleRef}
        disabled={disabled}
        toolbar={<EditorToolbar />}
        minHeightClass="min-h-72 max-h-[50vh] overflow-y-auto"
      />
    </div>
  );
}

function EmailMessageHelp({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label="About email personalization"
          className="inline-flex size-4 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          <InfoIcon className="size-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="right" className="max-w-xs">
        {text}
      </TooltipContent>
    </Tooltip>
  );
}

export function EmailDeliverySummary({ sender, recipient }: { sender: string; recipient: string }) {
  return (
    <div className="divide-y divide-border rounded-xl border border-border bg-card">
      <div className="grid grid-cols-[5rem_minmax(0,1fr)] gap-4 px-4 py-3">
        <span className="text-muted-foreground">From</span>
        <span className="min-w-0 truncate">{sender}</span>
      </div>
      <div className="grid grid-cols-[5rem_minmax(0,1fr)] gap-4 px-4 py-3">
        <span className="text-muted-foreground">To</span>
        <span className="min-w-0 break-all">{recipient}</span>
      </div>
    </div>
  );
}

export function getEmailSenderLabel(senderName: string | null | undefined) {
  const displayName = senderName ? `${senderName} via Comitium` : 'Comitium';

  return `${displayName} <messages@mail.comitium.co>`;
}

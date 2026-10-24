import { Badge } from '@comitium/ui/badge';
import { Button } from '@comitium/ui/button';
import { Spinner } from '@comitium/ui/spinner';
import { Tooltip, TooltipContent, TooltipTrigger } from '@comitium/ui/tooltip';
import { CheckIcon, CircleAlertIcon, TriangleAlertIcon } from 'lucide-react';
import type { Autosave } from '@/hooks/use-autosave';
import { getErrorMessage } from '@/lib/utils';

export function AutosaveStatus({ autosave }: { autosave: Autosave }) {
  const { error, isSaving, isDirty, hasInvalidChanges, validationMessages, retry } = autosave;
  const isConflict = error instanceof Error && error.message.toLowerCase().includes('version conflict');
  let content = (
    <>
      <CheckIcon className="size-3.5" />
      <span>Saved</span>
    </>
  );

  if (error) {
    content = (
      <>
        <CircleAlertIcon className="size-3.5 shrink-0 text-destructive" />
        <span className="max-w-48 truncate text-destructive" title={getErrorMessage(error)}>
          {isConflict ? 'Changed elsewhere. Reload to continue.' : getErrorMessage(error)}
        </span>
        <Button variant="ghost" size="sm" onClick={() => (isConflict ? window.location.reload() : void retry())}>
          {isConflict ? 'Reload' : 'Retry'}
        </Button>
      </>
    );
  } else if (isSaving) {
    content = (
      <>
        <Spinner className="size-3.5" />
        <span>Saving…</span>
      </>
    );
  } else if (hasInvalidChanges) {
    content = (
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="warning" asChild className="h-7 gap-1.5 text-copy-13">
            <button type="button">
              <TriangleAlertIcon />
              Unsaved changes
            </button>
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="end">
          <ul className="list-disc space-y-1 pl-3">
            {validationMessages.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        </TooltipContent>
      </Tooltip>
    );
  } else if (isDirty) {
    content = <span>Unsaved changes</span>;
  }

  return (
    <output
      className="flex min-h-8 min-w-0 flex-wrap items-center gap-1.5 text-copy-13 text-muted-foreground"
      aria-live="polite"
    >
      {content}
    </output>
  );
}

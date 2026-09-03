import { Input } from '@comitium/ui/input';
import { Label } from '@comitium/ui/label';
import {
  EmailMessageField,
  EmailTemplateField,
} from '@/components/features/candidate-communication/email-composer-fields';
import type { BulkEmailDraftController } from './use-bulk-email-draft';

export function BulkEmailComposerFields({ draft, disabled }: { draft: BulkEmailDraftController; disabled?: boolean }) {
  return (
    <div className="space-y-5">
      <BulkEmailTemplateField draft={draft} disabled={disabled} />
      <BulkEmailContentFields draft={draft} disabled={disabled} />
    </div>
  );
}

export function BulkEmailTemplateField({
  draft,
  disabled,
  label,
}: {
  draft: BulkEmailDraftController;
  disabled?: boolean;
  label?: string;
}) {
  const templatesDisabled = disabled || draft.templatesError || draft.templateOptions.length === 0;

  return (
    <EmailTemplateField
      label={label}
      options={draft.templateOptions}
      value={draft.selectedTemplateId}
      onValueChange={draft.handleTemplateChange}
      placeholder={getTemplatePlaceholder(draft)}
      emptyMessage="No templates found."
      loading={!draft.templatesReady}
      disabled={templatesDisabled}
      errorMessage={
        draft.templatesError ? 'Templates could not be loaded. You can still compose a message manually.' : undefined
      }
    />
  );
}

export function BulkEmailContentFields({ draft, disabled }: { draft: BulkEmailDraftController; disabled?: boolean }) {
  return (
    <>
      <div className="space-y-1.5">
        <Label htmlFor="pipeline-bulk-email-subject">Subject</Label>
        <Input
          id="pipeline-bulk-email-subject"
          value={draft.subject}
          placeholder="Email subject..."
          disabled={disabled}
          onChange={(event) => draft.setSubject(event.target.value)}
        />
      </div>

      <EmailMessageField
        editorKey={draft.editorKey}
        content={draft.editorContent}
        handleRef={draft.editorRef}
        disabled={disabled}
        helpText="Personalization tokens are resolved separately for each recipient."
      />
    </>
  );
}

function getTemplatePlaceholder(draft: BulkEmailDraftController) {
  if (draft.templatesError) return 'Templates unavailable';
  if (draft.templateOptions.length === 0) return 'No matching templates';

  return 'Select a template (optional)';
}

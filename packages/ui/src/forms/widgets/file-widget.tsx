import type { RenderableFormQuestion } from '@comitium/schemas/forms/form-definitions';
import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle,
  AttachmentTrigger,
} from '@comitium/ui/attachment';
import { PaperclipIcon, XIcon } from '@phosphor-icons/react';
import { useCallback, useRef } from 'react';
import type { ControllerRenderProps } from 'react-hook-form';

import { formatFileSize } from '../format-file-size';

interface FileWidgetProps {
  question: RenderableFormQuestion;
  field: ControllerRenderProps;
}

const RESUME_ACCEPT = 'application/pdf';
const RESUME_MAX_BYTES = 5 * 1024 * 1024;

const DEFAULT_FILE_ACCEPT =
  'application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/png,image/jpeg';

export function FileWidget({ question, field }: FileWidgetProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const file = field.value instanceof File ? field.value : null;

  const isResume = question.questionType === 'resume';
  const accept = isResume ? RESUME_ACCEPT : (question.config?.supportedFileTypes?.join(',') ?? DEFAULT_FILE_ACCEPT);
  const maxBytes = isResume ? RESUME_MAX_BYTES : (question.config?.maxFileSizeBytes ?? null);

  const handlePick = useCallback(() => inputRef.current?.click(), []);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const next = e.target.files?.[0] ?? null;

      field.onChange(next ?? undefined);
    },
    [field],
  );

  const handleClear = useCallback(() => {
    field.onChange(undefined);

    if (inputRef.current) {
      inputRef.current.value = '';
    }
  }, [field]);

  if (file) {
    return (
      <Attachment className="w-full">
        <AttachmentMedia>
          <PaperclipIcon />
        </AttachmentMedia>
        <AttachmentContent>
          <AttachmentTitle>{file.name}</AttachmentTitle>
          <AttachmentDescription>{formatFileSize(file.size)}</AttachmentDescription>
        </AttachmentContent>
        <AttachmentActions>
          <AttachmentAction
            type="button"
            aria-label={`Remove ${file.name}`}
            onClick={handleClear}
            data-form-focus-target=""
          >
            <XIcon />
          </AttachmentAction>
        </AttachmentActions>
      </Attachment>
    );
  }

  return (
    <div className="relative">
      <input ref={inputRef} type="file" accept={accept} onChange={handleChange} className="sr-only" name={field.name} />
      <Attachment state="idle" className="w-full cursor-pointer">
        <AttachmentTrigger
          type="button"
          aria-label={isResume ? 'Upload resume PDF' : 'Upload file'}
          onClick={handlePick}
          data-form-focus-target=""
        />
        <AttachmentMedia>
          <PaperclipIcon />
        </AttachmentMedia>
        <AttachmentContent>
          <AttachmentTitle>{isResume ? 'Upload resume (PDF)' : 'Upload file'}</AttachmentTitle>
          {maxBytes && <AttachmentDescription>{formatFileSize(maxBytes)} max</AttachmentDescription>}
        </AttachmentContent>
      </Attachment>
    </div>
  );
}

import { currencyAnswerSchema, scoreAnswerSchema } from '@comitium/schemas/forms/answer-values';
import type { FormSnapshotQuestion } from '@comitium/schemas/forms/form-definitions';
import type {
  FileDisplayMetadata,
  FormDefinitionSnapshot,
  FormSubmissionFile,
} from '@comitium/schemas/forms/form-submission';
import { isDefined, isNonEmptyString, isRecord } from '@comitium/schemas/guards';
import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle,
} from '@comitium/ui/attachment';
import { Badge } from '@comitium/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@comitium/ui/tooltip';
import { DownloadIcon, LockIcon, PaperclipIcon, SpinnerGapIcon } from '@phosphor-icons/react';
import { format } from 'date-fns';
import type { ComponentType } from 'react';
import { useCallback } from 'react';

import { formatFileSize } from './format-file-size';

function formatDate(value: string): string {
  return format(value, 'MMM d, yyyy');
}

type DownloadAttachment = (questionId: string, fileId: string, filename: string, mimeType?: string) => void;

export interface FormattableTextDisplayProps {
  value: string;
}

export interface FormDisplayProps {
  snapshot: FormDefinitionSnapshot;
  answers: Record<string, unknown> | null;
  files?: Record<string, FormSubmissionFile>;
  fileMeta?: Record<string, FileDisplayMetadata> | null;
  canReadPrivate?: boolean;
  onDownloadAttachment?: DownloadAttachment;
  downloadingQuestionId?: string | null;
  formattableTextDisplay?: ComponentType<FormattableTextDisplayProps>;
}

export function FormDisplay({
  snapshot,
  answers,
  files,
  fileMeta,
  canReadPrivate = true,
  onDownloadAttachment,
  downloadingQuestionId,
  formattableTextDisplay,
}: FormDisplayProps) {
  const sections = snapshot.sections
    .map((section) => ({
      section,
      questions: section.questions.filter((q) => canReadPrivate || !q.isPrivate),
    }))
    .filter((entry) => entry.questions.length > 0);

  return (
    <div className="flex flex-col gap-6">
      {sections.map(({ section, questions }) => (
        <section key={section.id} className="flex flex-col gap-3">
          {section.title && <h4 className="text-heading-14">{section.title}</h4>}
          <div className="flex flex-col gap-3">
            {questions.map((q) => {
              const file = files?.[q.id];
              const meta = file ? (fileMeta?.[file.fileId] ?? null) : null;

              return (
                <AnswerRow
                  key={q.id}
                  question={q}
                  value={answers?.[q.id]}
                  file={file}
                  meta={meta}
                  onDownloadAttachment={onDownloadAttachment}
                  isDownloading={downloadingQuestionId === q.id}
                  formattableTextDisplay={formattableTextDisplay}
                />
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

interface AnswerRowProps {
  question: FormSnapshotQuestion;
  value: unknown;
  file?: FormSubmissionFile;
  meta?: FileDisplayMetadata | null;
  onDownloadAttachment?: DownloadAttachment;
  isDownloading?: boolean;
  formattableTextDisplay?: ComponentType<FormattableTextDisplayProps>;
}

function AnswerRow({
  question,
  value,
  file,
  meta,
  onDownloadAttachment,
  isDownloading,
  formattableTextDisplay,
}: AnswerRowProps) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <p className="text-label-12 text-muted-foreground">{question.prompt}</p>
        {question.isPrivate && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label="Private field"
                className="inline-flex shrink-0 cursor-help text-muted-foreground"
              >
                <LockIcon className="size-3" aria-hidden="true" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">Private field. Only organization admins can view it.</TooltipContent>
          </Tooltip>
        )}
      </div>
      <div className="text-copy-14">
        <AnswerValue
          question={question}
          value={value}
          file={file}
          meta={meta}
          onDownloadAttachment={onDownloadAttachment}
          isDownloading={isDownloading}
          formattableTextDisplay={formattableTextDisplay}
        />
      </div>
    </div>
  );
}

function AnswerValue({
  question,
  value,
  file,
  meta,
  onDownloadAttachment,
  isDownloading,
  formattableTextDisplay,
}: AnswerRowProps) {
  if (question.questionType === 'file') {
    return (
      <FileAttachment
        question={question}
        file={file}
        meta={meta}
        onDownloadAttachment={onDownloadAttachment}
        isDownloading={isDownloading}
      />
    );
  }

  if (!isDefined(value) || value === '') {
    return <span className="text-muted-foreground italic">No answer</span>;
  }

  switch (question.questionType) {
    case 'yes_no':
      return <Badge variant={value === true ? 'secondary' : 'outline'}>{value === true ? 'Yes' : 'No'}</Badge>;

    case 'multiple_choice': {
      const opt = question.selectableValues?.find((o) => o.value === value);

      return <span>{opt?.label ?? String(value)}</span>;
    }

    case 'checkboxes': {
      if (!Array.isArray(value) || value.length === 0) {
        return <span className="text-muted-foreground italic">No answer</span>;
      }

      return (
        <div className="flex flex-wrap gap-1.5">
          {value.map((v) => {
            const opt = question.selectableValues?.find((o) => o.value === v);

            return (
              <Badge key={String(v)} variant="secondary">
                {opt?.label ?? String(v)}
              </Badge>
            );
          })}
        </div>
      );
    }

    case 'date':
      return <span>{formatDate(value as string)}</span>;

    case 'location':
    case 'candidate_location': {
      if (!isRecord(value)) {
        return <span className="text-muted-foreground italic">No answer</span>;
      }

      const loc = value;

      return <span>{[loc.city, loc.region, loc.country].filter(Boolean).join(', ') || 'No answer'}</span>;
    }

    case 'score': {
      const scoreAnswer = scoreAnswerSchema.safeParse(value);

      if (!scoreAnswer.success) {
        return <span className="text-muted-foreground italic">No answer</span>;
      }

      return (
        <div className="space-y-1.5">
          <Badge variant="secondary">{scoreAnswer.data.score} / 5</Badge>
          {scoreAnswer.data.comment && <p className="whitespace-pre-wrap">{scoreAnswer.data.comment}</p>}
        </div>
      );
    }

    case 'linear_rating':
    case 'nps_rating':
      return <Badge variant="secondary">{String(value)}</Badge>;

    case 'resume':
      return <ResumeAttachment value={value} />;

    case 'number':
      return <span>{String(value)}</span>;

    case 'currency':
      return <span>{formatCurrencyAnswer(value)}</span>;

    case 'long_formattable': {
      const FormattableTextDisplay = formattableTextDisplay;

      if (!FormattableTextDisplay) {
        return <span className="whitespace-pre-wrap">{String(value)}</span>;
      }

      return <FormattableTextDisplay value={String(value)} />;
    }

    default:
      return <span className="whitespace-pre-wrap">{String(value)}</span>;
  }
}

function formatCurrencyAnswer(value: unknown): string {
  const answer = currencyAnswerSchema.safeParse(value);

  if (!answer.success) {
    return 'No answer';
  }

  try {
    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: answer.data.currency,
      currencyDisplay: 'symbol',
    }).format(answer.data.amount);

    return `${formatted} ${answer.data.currency}`;
  } catch {
    return `${answer.data.amount} ${answer.data.currency}`;
  }
}

function ResumeAttachment({ value }: { value: unknown }) {
  if (!isRecord(value)) {
    return <span className="text-muted-foreground italic">No answer</span>;
  }

  const filename = getResumeFilename(value);

  return (
    <Attachment size="sm" className="w-fit max-w-full">
      <AttachmentMedia>
        <PaperclipIcon />
      </AttachmentMedia>
      <AttachmentContent>
        <AttachmentTitle>{filename}</AttachmentTitle>
      </AttachmentContent>
    </Attachment>
  );
}

function getResumeFilename(value: Record<string, unknown>): string {
  if (isNonEmptyString(value.fileName)) {
    return value.fileName;
  }

  if (isNonEmptyString(value.filename)) {
    return value.filename;
  }

  return 'Resume';
}

interface FileAttachmentProps {
  question: FormSnapshotQuestion;
  file?: FormSubmissionFile;
  meta?: FileDisplayMetadata | null;
  onDownloadAttachment?: DownloadAttachment;
  isDownloading?: boolean;
}

function FileAttachment({ question, file, meta, onDownloadAttachment, isDownloading }: FileAttachmentProps) {
  const filename = meta?.fileName ?? 'Attachment';
  const fileId = file?.fileId ?? null;
  const mimeType = meta?.mimeType;
  const originalSize = meta?.originalSize ?? null;

  const handleDownload = useCallback(() => {
    if (!fileId) {
      return;
    }

    onDownloadAttachment?.(question.id, fileId, filename, mimeType);
  }, [onDownloadAttachment, question.id, fileId, filename, mimeType]);

  if (!file) {
    return <span className="text-muted-foreground italic">No answer</span>;
  }

  if (!onDownloadAttachment) {
    return (
      <Attachment size="sm" className="w-fit max-w-full">
        <AttachmentMedia>
          <PaperclipIcon />
        </AttachmentMedia>
        <AttachmentContent>
          <AttachmentTitle>{filename}</AttachmentTitle>
          {originalSize !== null && <AttachmentDescription>{formatFileSize(originalSize)}</AttachmentDescription>}
        </AttachmentContent>
      </Attachment>
    );
  }

  return (
    <Attachment size="sm" className="w-fit max-w-full">
      <AttachmentMedia>
        <PaperclipIcon />
      </AttachmentMedia>
      <AttachmentContent>
        <AttachmentTitle>{filename}</AttachmentTitle>
        {originalSize !== null && <AttachmentDescription>{formatFileSize(originalSize)}</AttachmentDescription>}
      </AttachmentContent>
      <AttachmentActions>
        <AttachmentAction
          type="button"
          aria-label={`Download ${filename}`}
          onClick={handleDownload}
          disabled={isDownloading}
        >
          {isDownloading ? <SpinnerGapIcon className="animate-spin" /> : <DownloadIcon />}
        </AttachmentAction>
      </AttachmentActions>
    </Attachment>
  );
}

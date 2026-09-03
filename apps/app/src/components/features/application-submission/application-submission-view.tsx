import type {
  FileDisplayMetadata,
  FormSubmissionFile,
  FormSubmissionResponse,
} from '@comitium/schemas/forms/form-submission';
import { Button } from '@comitium/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@comitium/ui/card';
import { formatRelativeTime } from '@comitium/ui/date';
import { Skeleton } from '@comitium/ui/skeleton';
import { useMemo } from 'react';
import { EncryptedPlaceholder } from '@/components/features/encryption/encrypted-placeholder';
import { FormDisplay } from '@/components/features/form-runtime';
import { useEncryptionUnlocked } from '@/hooks/use-encryption-unlocked';
import { ApplicationFormIcon } from '@/lib/constants/domain-icons';
import { cn } from '@/lib/utils';

export interface ApplicationFormState {
  submission: FormSubmissionResponse | null;
  answers: Record<string, unknown> | null;
  fileMeta: Record<string, FileDisplayMetadata> | null;
  decryptionError: string | null;
  isDecrypting: boolean;
  isLoading: boolean;
  isError: boolean;
  downloadingQuestionId: string | null;
  onRetryQuery?: () => void;
  onRetryDecryption: () => void;
  onDownloadAttachment: (questionId: string, fileId: string, filename: string, mimeType?: string) => void;
}

interface ApplicationSubmissionViewProps {
  className?: string;
  form: ApplicationFormState;
  orgId: string;
}

type ApplicationSubmissionViewState =
  | 'loading'
  | 'query-error'
  | 'empty'
  | 'locked'
  | 'decryption-error'
  | 'decrypting'
  | 'ready';

function submissionHasEncryptedContent(submission: FormSubmissionResponse) {
  return (
    submission.answerEnvelopes.length > 0 ||
    submission.candidateIdentityInputs.length > 0 ||
    submission.files.length > 0
  );
}

function submissionHasEncryptedAnswers(submission: FormSubmissionResponse) {
  return submission.answerEnvelopes.length > 0 || submission.candidateIdentityInputs.length > 0;
}

function submissionHasEncryptedFiles(submission: FormSubmissionResponse) {
  return submission.files.length > 0;
}

function resolveViewState(form: ApplicationFormState, isUnlocked: boolean): ApplicationSubmissionViewState {
  if (form.isLoading) {
    return 'loading';
  }

  if (form.submission === null) {
    return form.isError ? 'query-error' : 'empty';
  }

  if (!submissionHasEncryptedContent(form.submission)) {
    return 'ready';
  }

  if (!isUnlocked) {
    return 'locked';
  }

  if (form.decryptionError !== null) {
    return 'decryption-error';
  }

  if (
    form.isDecrypting ||
    (submissionHasEncryptedAnswers(form.submission) && form.answers === null) ||
    (submissionHasEncryptedFiles(form.submission) && form.fileMeta === null)
  ) {
    return 'decrypting';
  }

  return 'ready';
}

function ApplicationSubmissionSkeleton() {
  return (
    <Card size="sm">
      <CardHeader>
        <Skeleton className="h-5 w-36" />
        <Skeleton className="h-4 w-48" />
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-16 w-full" />
      </CardContent>
    </Card>
  );
}

export function ApplicationSubmissionView({ className, form, orgId }: ApplicationSubmissionViewProps) {
  const { isUnlocked } = useEncryptionUnlocked(orgId);
  const {
    submission,
    answers,
    fileMeta,
    downloadingQuestionId,
    onRetryQuery,
    onRetryDecryption,
    onDownloadAttachment,
  } = form;

  const filesByQuestion = useMemo(
    () =>
      (submission?.files ?? []).reduce<Record<string, FormSubmissionFile>>((acc, file) => {
        acc[file.questionId] = file;

        return acc;
      }, {}),
    [submission],
  );

  const viewState = resolveViewState(form, isUnlocked);

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {(viewState === 'loading' || viewState === 'decrypting') && <ApplicationSubmissionSkeleton />}

      {viewState === 'query-error' && (
        <div className="flex items-center justify-between gap-3 rounded-md bg-muted p-3">
          <p className="text-copy-12 text-muted-foreground">Application could not be loaded.</p>
          {onRetryQuery && (
            <Button type="button" variant="outline" size="xs" onClick={onRetryQuery}>
              Try again
            </Button>
          )}
        </div>
      )}

      {viewState === 'empty' && (
        <div className="flex flex-col items-center gap-2 px-4 py-8 text-center text-muted-foreground">
          <ApplicationFormIcon className="size-5" />
          <p className="text-copy-12">No application form was submitted</p>
        </div>
      )}

      {viewState === 'locked' && <EncryptedPlaceholder orgId={orgId} variant="block" lines={5} />}

      {viewState === 'decryption-error' && (
        <div className="flex items-center justify-between gap-3 rounded-md bg-muted p-3">
          <p className="text-copy-12 text-muted-foreground">Application data could not be decrypted.</p>
          <Button type="button" variant="outline" size="xs" onClick={onRetryDecryption}>
            Try again
          </Button>
        </div>
      )}

      {viewState === 'ready' && submission !== null && (
        <Card size="sm">
          <CardHeader>
            <CardTitle>{submission.formSnapshot.title}</CardTitle>
            <CardDescription>Submitted {formatRelativeTime(submission.submittedAt)}</CardDescription>
          </CardHeader>
          <CardContent>
            <FormDisplay
              snapshot={submission.formSnapshot}
              answers={answers}
              files={filesByQuestion}
              fileMeta={fileMeta}
              canReadPrivate={submission.canReadPrivate}
              onDownloadAttachment={onDownloadAttachment}
              downloadingQuestionId={downloadingQuestionId}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

import { useCryptoUnlock } from '@comitium/auth/use-crypto-unlock';
import { CryptoProxy, type PublicEncryptionKey } from '@comitium/crypto';
import { feedbackAnswerBucketContext } from '@comitium/crypto/context';
import type { WrappedKey } from '@comitium/schemas/common';
import type { FormDefinitionSnapshot } from '@comitium/schemas/forms/form-submission';
import { extractSubmissionFieldValues } from '@comitium/schemas/forms/submission-field-values';
import { splitAnswersByVisibility } from '@comitium/schemas/forms/visibility';
import { Button } from '@comitium/ui/button';
import { Form } from '@comitium/ui/form';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@comitium/ui/sheet';
import { Skeleton } from '@comitium/ui/skeleton';
import { Spinner } from '@comitium/ui/spinner';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useId, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { buildFormSchema, FormRenderer } from '@/components/features/form-runtime';
import { useCreateFeedbackSubmission, useUpdateFeedbackSubmission } from '@/hooks/mutations/use-feedback-submission';
import { cn, getErrorMessage } from '@/lib/utils';
import { formatSheetDescription, getFormTitle, getSheetTitle, getSourceContextLabel } from './labels';
import {
  type FeedbackSubmissionFlowResult,
  type FeedbackSubmissionSource,
  getFeedbackSubmissionSourceBody,
  useFeedbackSubmissionFlow,
} from './use-feedback-submission-flow';

export type { FeedbackSubmissionSource };

interface FeedbackSubmissionSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  applicationId: string;
  orgId: string;
  source: FeedbackSubmissionSource | null;
  currentUserId: string | undefined;
  vaultPublicKey: PublicEncryptionKey | null;
  vaultKeyVersion: number | null;
  wrappedVaultKey: WrappedKey | undefined;
  candidateName: string | null;
}

interface FeedbackSubmissionPanelProps {
  active: boolean;
  applicationId: string;
  orgId: string;
  source: FeedbackSubmissionSource | null;
  currentUserId: string | undefined;
  vaultPublicKey: PublicEncryptionKey | null;
  vaultKeyVersion: number | null;
  wrappedVaultKey: WrappedKey | undefined;
  onComplete: () => void;
  onCancel?: () => void;
}

export function FeedbackSubmissionSheet({
  open,
  onOpenChange,
  applicationId,
  orgId,
  source,
  currentUserId,
  vaultPublicKey,
  vaultKeyVersion,
  wrappedVaultKey,
  candidateName,
}: FeedbackSubmissionSheetProps) {
  const flow = useFeedbackSubmissionFlow({
    open,
    applicationId,
    orgId,
    source,
    currentUserId,
    wrappedVaultKey,
  });

  const handleClose = useCallback(() => onOpenChange(false), [onOpenChange]);

  const sourceContextLabel = getSourceContextLabel(source);
  const sheetDescription = formatSheetDescription(candidateName, sourceContextLabel);
  const formTitle = flow.snapshot ? getFormTitle(source, flow.snapshot.title) : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-[720px] flex flex-col p-0">
        <SheetHeader className="border-b shrink-0 px-6 py-4 gap-1">
          <SheetTitle>{getSheetTitle(flow.mode, source)}</SheetTitle>
          <SheetDescription className="flex flex-col items-start gap-0.5">
            <span>{sheetDescription}</span>
            {formTitle && <span className="text-label-12">{formTitle}</span>}
          </SheetDescription>
        </SheetHeader>
        <FeedbackSubmissionView
          flow={flow}
          applicationId={applicationId}
          orgId={orgId}
          source={source}
          vaultPublicKey={vaultPublicKey}
          vaultKeyVersion={vaultKeyVersion}
          onComplete={handleClose}
          onCancel={handleClose}
        />
      </SheetContent>
    </Sheet>
  );
}

export function FeedbackSubmissionPanel({
  active,
  applicationId,
  orgId,
  source,
  currentUserId,
  vaultPublicKey,
  vaultKeyVersion,
  wrappedVaultKey,
  onComplete,
  onCancel,
}: FeedbackSubmissionPanelProps) {
  const flow = useFeedbackSubmissionFlow({
    open: active,
    applicationId,
    orgId,
    source,
    currentUserId,
    wrappedVaultKey,
  });

  return (
    <FeedbackSubmissionView
      flow={flow}
      applicationId={applicationId}
      orgId={orgId}
      source={source}
      vaultPublicKey={vaultPublicKey}
      vaultKeyVersion={vaultKeyVersion}
      onComplete={onComplete}
      onCancel={onCancel}
      showFormContext
    />
  );
}

interface FeedbackSubmissionViewProps {
  flow: FeedbackSubmissionFlowResult;
  applicationId: string;
  orgId: string;
  source: FeedbackSubmissionSource | null;
  vaultPublicKey: PublicEncryptionKey | null;
  vaultKeyVersion: number | null;
  onComplete: () => void;
  onCancel?: () => void;
  showFormContext?: boolean;
}

function FeedbackSubmissionView({
  flow,
  applicationId,
  orgId,
  source,
  vaultPublicKey,
  vaultKeyVersion,
  onComplete,
  onCancel,
  showFormContext = false,
}: FeedbackSubmissionViewProps) {
  const formTitle = getFormTitle(source, flow.snapshot?.title);

  if (flow.isLoading) {
    return <FeedbackSubmissionSkeleton />;
  }

  if (flow.error) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-center text-copy-14 text-destructive">
        {flow.error}
      </div>
    );
  }

  if (!flow.snapshot || !flow.defaultValues || !flow.formId || !source) {
    return null;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {showFormContext && <p className="shrink-0 px-6 pt-6 text-label-12 text-muted-foreground">{formTitle}</p>}
      <FeedbackForm
        applicationId={applicationId}
        orgId={orgId}
        source={source}
        snapshot={flow.snapshot}
        defaultValues={flow.defaultValues}
        mode={flow.mode ?? 'create'}
        formId={flow.formId}
        previousSubmissionId={flow.previousSubmissionId}
        vaultPublicKey={vaultPublicKey}
        vaultKeyVersion={vaultKeyVersion}
        onComplete={onComplete}
        onCancel={onCancel}
      />
    </div>
  );
}

export function FeedbackSubmissionSkeleton() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 space-y-7 overflow-hidden p-6">
        <Skeleton className="h-4 w-48" />

        <FeedbackFieldSkeleton labelWidth="w-36" fieldClassName="h-10" />
        <FeedbackFieldSkeleton labelWidth="w-44" fieldClassName="h-24" />
        <FeedbackFieldSkeleton labelWidth="w-28" fieldClassName="h-10" />
      </div>

      <div className="flex shrink-0 justify-end px-6 py-4">
        <Skeleton className="h-9 w-32 rounded-xl" />
      </div>
    </div>
  );
}

function FeedbackFieldSkeleton({ labelWidth, fieldClassName }: { labelWidth: string; fieldClassName: string }) {
  return (
    <div className="space-y-3">
      <Skeleton className={cn('h-4', labelWidth)} />
      <Skeleton className={cn('w-full rounded-xl', fieldClassName)} />
    </div>
  );
}

interface FeedbackFormProps {
  applicationId: string;
  orgId: string;
  source: FeedbackSubmissionSource;
  snapshot: FormDefinitionSnapshot;
  defaultValues: Record<string, unknown>;
  mode: 'create' | 'edit';
  formId: string;
  previousSubmissionId: string | null;
  vaultPublicKey: PublicEncryptionKey | null;
  vaultKeyVersion: number | null;
  onComplete: () => void;
  onCancel?: () => void;
}

function FeedbackForm({
  applicationId,
  orgId,
  source,
  snapshot,
  defaultValues,
  mode,
  formId,
  previousSubmissionId,
  vaultPublicKey,
  vaultKeyVersion,
  onComplete,
  onCancel,
}: FeedbackFormProps) {
  const { mutate: createSubmission, isPending: isCreating } = useCreateFeedbackSubmission();
  const { mutate: updateSubmission, isPending: isUpdating } = useUpdateFeedbackSubmission();
  const { ensureUnlocked } = useCryptoUnlock();
  const htmlFormId = useId();

  const [isEncrypting, setIsEncrypting] = useState(false);

  const form = useForm<Record<string, unknown>>({
    resolver: zodResolver(buildFormSchema(snapshot)),
    defaultValues,
  });

  const handleSubmit = useCallback(
    async (values: Record<string, unknown>) => {
      if (!vaultPublicKey || vaultKeyVersion === null) {
        toast.error('Encryption keys not ready');

        return;
      }

      setIsEncrypting(true);

      try {
        await ensureUnlocked();

        const fieldValues = extractSubmissionFieldValues(snapshot, values);
        const answerEnvelopes = await Promise.all(
          splitAnswersByVisibility(snapshot.sections, values).map(async (bucket) => ({
            visibility: bucket.visibility,
            answers: await CryptoProxy.encryptApplication(
              vaultPublicKey,
              vaultKeyVersion,
              bucket.answers,
              feedbackAnswerBucketContext(orgId, applicationId, formId, bucket.visibility),
            ),
          })),
        );

        if (mode === 'edit' && previousSubmissionId) {
          updateSubmission(
            {
              applicationId,
              submissionId: previousSubmissionId,
              body: { answerEnvelopes, fieldValues },
            },
            { onSuccess: onComplete },
          );

          return;
        }

        const sourceBody = getFeedbackSubmissionSourceBody(source);

        createSubmission(
          {
            applicationId,
            body: { ...sourceBody, formId, answerEnvelopes, fieldValues },
          },
          { onSuccess: onComplete },
        );
      } catch (error) {
        toast.error(getErrorMessage(error, 'Failed to encrypt feedback'));
      } finally {
        setIsEncrypting(false);
      }
    },
    [
      vaultPublicKey,
      vaultKeyVersion,
      mode,
      previousSubmissionId,
      applicationId,
      orgId,
      source,
      formId,
      createSubmission,
      updateSubmission,
      onComplete,
      ensureUnlocked,
    ],
  );

  const isPending = isCreating || isUpdating || isEncrypting;
  const submitLabel = mode === 'edit' ? 'Save changes' : 'Submit feedback';

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 overflow-y-auto">
        <Form {...form}>
          <form id={htmlFormId} onSubmit={form.handleSubmit(handleSubmit)} className="p-6">
            <FormRenderer form={snapshot} control={form.control} />
          </form>
        </Form>
      </div>

      <SheetFooter className="shrink-0 flex-row justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
            Cancel
          </Button>
        )}
        <Button type="submit" form={htmlFormId} disabled={isPending || !vaultPublicKey || vaultKeyVersion === null}>
          {isPending && <Spinner data-icon="inline-start" />}
          {submitLabel}
        </Button>
      </SheetFooter>
    </div>
  );
}

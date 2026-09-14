import { useCryptoUnlock } from '@comitium/auth/use-crypto-unlock';
import { CryptoProxy, type PublicEncryptionKey } from '@comitium/crypto';
import { feedbackAnswerBucketContext } from '@comitium/crypto/context';
import type { WrappedKey } from '@comitium/schemas/common';
import type { FormDefinitionSnapshot } from '@comitium/schemas/forms/form-submission';
import { splitAnswersByVisibility } from '@comitium/schemas/forms/visibility';
import { Badge } from '@comitium/ui/badge';
import { Button } from '@comitium/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@comitium/ui/card';
import { FeatureSheetContent, FeatureSheetHeader } from '@comitium/ui/feature-sheet';
import { Form } from '@comitium/ui/form';
import { Sheet, SheetDescription, SheetTitle } from '@comitium/ui/sheet';
import { Skeleton } from '@comitium/ui/skeleton';
import { Spinner } from '@comitium/ui/spinner';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useId, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { buildFormSchema, FormRenderer } from '@/components/features/form-runtime';
import { useCreateFeedbackSubmission, useUpdateFeedbackSubmission } from '@/hooks/mutations/use-feedback-submission';
import { projectSubmissionFieldValues } from '@/lib/forms/submission-field-projections';
import { cn, getErrorMessage, isDefined } from '@/lib/utils';
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
      <FeatureSheetContent side="right" size="form">
        <FeatureSheetHeader className="gap-1">
          <SheetTitle>{getSheetTitle(flow.mode, source)}</SheetTitle>
          <SheetDescription className="flex flex-col items-start gap-0.5">
            <span>{sheetDescription}</span>
            {formTitle && (
              <span className="mt-1 inline-flex items-center gap-2">
                <Badge variant="subtle">Feedback form</Badge>
                <span className="text-label-12">{formTitle}</span>
              </span>
            )}
          </SheetDescription>
        </FeatureSheetHeader>
        <FeedbackSubmissionView
          flow={flow}
          applicationId={applicationId}
          orgId={orgId}
          source={source}
          vaultPublicKey={vaultPublicKey}
          vaultKeyVersion={vaultKeyVersion}
          wrappedVaultKey={wrappedVaultKey}
          onComplete={handleClose}
          onCancel={handleClose}
        />
      </FeatureSheetContent>
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
      wrappedVaultKey={wrappedVaultKey}
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
  wrappedVaultKey: WrappedKey | undefined;
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
  wrappedVaultKey,
  onComplete,
  onCancel,
  showFormContext = false,
}: FeedbackSubmissionViewProps) {
  const formTitle = getFormTitle(source, flow.snapshot?.title);

  if (flow.isLoading) {
    return <FeedbackSubmissionSkeleton contained={showFormContext} />;
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

  const feedbackForm = (
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
      wrappedVaultKey={wrappedVaultKey}
      onComplete={onComplete}
      onCancel={onCancel}
      contained={showFormContext}
    />
  );

  if (showFormContext) {
    return (
      <Card size="sm">
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2">
            <span>{formTitle}</span>
            <Badge variant="subtle">Feedback form</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>{feedbackForm}</CardContent>
      </Card>
    );
  }

  return <div className="flex min-h-0 flex-1 flex-col">{feedbackForm}</div>;
}

export function FeedbackSubmissionSkeleton({ contained = false }: { contained?: boolean } = {}) {
  const fields = (
    <div className="space-y-6">
      <FeedbackFieldSkeleton labelWidth="w-36" fieldClassName="h-10" />
      <FeedbackFieldSkeleton labelWidth="w-44" fieldClassName="h-24" />
      <FeedbackFieldSkeleton labelWidth="w-28" fieldClassName="h-10" />

      <div className="flex justify-end pt-1">
        <Skeleton className="h-9 w-32 rounded-xl" />
      </div>
    </div>
  );

  if (contained) {
    return (
      <Card size="sm">
        <CardHeader>
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent>{fields}</CardContent>
      </Card>
    );
  }

  return (
    <div className="min-h-0 flex-1 overflow-hidden p-6">
      <div className="space-y-6">
        <Skeleton className="h-4 w-48" />
        {fields}
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
  wrappedVaultKey: WrappedKey | undefined;
  onComplete: () => void;
  onCancel?: () => void;
  contained?: boolean;
}

function FeedbackForm(props: FeedbackFormProps) {
  const {
    applicationId,
    orgId,
    source,
    snapshot,
    defaultValues,
    mode,
    formId,
    previousSubmissionId,
    onComplete,
    onCancel,
    contained = false,
  } = props;
  const { mutate: createSubmission, isPending: isCreating } = useCreateFeedbackSubmission();
  const { mutate: updateSubmission, isPending: isUpdating } = useUpdateFeedbackSubmission();
  const { ensureUnlocked } = useCryptoUnlock();
  const htmlFormId = useId();
  const encryptionContext = getFeedbackEncryptionContext(props);

  const [isEncrypting, setIsEncrypting] = useState(false);

  const form = useForm<Record<string, unknown>>({
    resolver: zodResolver(buildFormSchema(snapshot)),
    defaultValues,
  });

  const handleSubmit = async (values: Record<string, unknown>) => {
    if (!isDefined(encryptionContext)) {
      toast.error('Encryption keys not ready');

      return;
    }

    const { vaultPublicKey, vaultKeyVersion, wrappedVaultKey } = encryptionContext;

    setIsEncrypting(true);

    try {
      await ensureUnlocked();

      const [fieldValues, answerEnvelopes] = await Promise.all([
        projectSubmissionFieldValues(orgId, wrappedVaultKey, snapshot, values),
        Promise.all(
          splitAnswersByVisibility(snapshot.sections, values).map(async (bucket) => ({
            visibility: bucket.visibility,
            answers: await CryptoProxy.encryptApplication(
              vaultPublicKey,
              vaultKeyVersion,
              bucket.answers,
              feedbackAnswerBucketContext(orgId, applicationId, formId, bucket.visibility),
            ),
          })),
        ),
      ]);

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
  };

  const isPending = isCreating || isUpdating || isEncrypting;
  const submitLabel = mode === 'edit' ? 'Save changes' : 'Submit feedback';

  return (
    <div className={cn('min-h-0 flex-1', !contained && 'overflow-y-auto')}>
      <Form {...form}>
        <form
          id={htmlFormId}
          onSubmit={form.handleSubmit(handleSubmit)}
          className={cn('flex flex-col gap-6', !contained && 'px-6 pt-6 pb-6')}
        >
          <FormRenderer form={snapshot} control={form.control} variant="feedback" />

          <div className="flex shrink-0 flex-row justify-end gap-2 pt-1">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
                Cancel
              </Button>
            )}
            <Button type="submit" disabled={isPending || !isDefined(encryptionContext)}>
              {isPending && <Spinner data-icon="inline-start" />}
              {submitLabel}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

interface FeedbackEncryptionContext {
  vaultPublicKey: PublicEncryptionKey;
  vaultKeyVersion: number;
  wrappedVaultKey: WrappedKey;
}

function getFeedbackEncryptionContext({
  vaultPublicKey,
  vaultKeyVersion,
  wrappedVaultKey,
}: FeedbackFormProps): FeedbackEncryptionContext | null {
  if (!isDefined(vaultPublicKey)) {
    return null;
  }

  if (!isDefined(vaultKeyVersion)) {
    return null;
  }

  if (!isDefined(wrappedVaultKey)) {
    return null;
  }

  return { vaultPublicKey, vaultKeyVersion, wrappedVaultKey };
}

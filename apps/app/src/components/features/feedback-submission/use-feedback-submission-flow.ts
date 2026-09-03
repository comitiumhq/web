import { useCryptoUnlock } from '@comitium/auth/use-crypto-unlock';
import type { WrappedKey } from '@comitium/schemas/common';
import { getErrorMessage } from '@comitium/schemas/error';
import type { FormDefinitionSnapshot } from '@comitium/schemas/forms/form-submission';
import { useEffect, useMemo, useState } from 'react';
import { buildDefaultValues } from '@/components/features/form-runtime';
import { useResolveFeedbackForm } from '@/hooks/mutations/use-feedback-submission';
import { useQueryFeedbackSubmissions } from '@/hooks/queries/use-query-feedback-submissions';
import { decryptFeedbackBuckets } from '@/lib/forms/decrypt-answers';
import type { FeedbackSubmission } from '@/lib/schemas/feedback-submissions';
import type { ApplicationReviewActivity } from '@/lib/schemas/stage-activities';

export type FeedbackSubmissionSource =
  | { kind: 'activity'; activity: ApplicationReviewActivity; stageName: string | null }
  | { kind: 'event'; eventId: string; interviewTitle: string };

type ReadyState = {
  status: 'ready';
  snapshot: FormDefinitionSnapshot;
  defaultValues: Record<string, unknown>;
  mode: 'create' | 'edit';
  formId: string;
  previousSubmissionId: string | null;
};

type FormState = { status: 'idle' } | { status: 'loading' } | ReadyState | { status: 'error'; message: string };

interface UseFeedbackSubmissionFlowParams {
  open: boolean;
  applicationId: string;
  orgId: string;
  source: FeedbackSubmissionSource | null;
  currentUserId: string | undefined;
  wrappedVaultKey: WrappedKey | undefined;
}

export interface FeedbackSubmissionFlowResult {
  isLoading: boolean;
  error: string | null;
  snapshot: FormDefinitionSnapshot | null;
  defaultValues: Record<string, unknown> | null;
  mode: 'create' | 'edit' | null;
  formId: string | null;
  previousSubmissionId: string | null;
}

type ResolveFeedbackFormAsync = ReturnType<typeof useResolveFeedbackForm>['mutateAsync'];

export function getFeedbackSubmissionSourceBody(source: FeedbackSubmissionSource) {
  return source.kind === 'activity' ? { activityId: source.activity.id } : { interviewEventId: source.eventId };
}

function findOwnPrevious(
  submissions: FeedbackSubmission[] | undefined,
  currentUserId: string | undefined,
  source: FeedbackSubmissionSource | null,
): FeedbackSubmission | null {
  if (!submissions || !currentUserId || !source) {
    return null;
  }

  return (
    submissions.find((s) => {
      if (s.isDeleted || s.submittedByUserId !== currentUserId) {
        return false;
      }

      if (source.kind === 'activity') {
        return s.activityId === source.activity.id;
      }

      return s.interviewEventId === source.eventId;
    }) ?? null
  );
}

async function buildEditState(
  previous: FeedbackSubmission,
  applicationId: string,
  orgId: string,
  wrappedVaultKey: WrappedKey,
  ensureUnlocked: () => Promise<void>,
): Promise<ReadyState> {
  await ensureUnlocked();

  const values = await decryptFeedbackBuckets(
    orgId,
    applicationId,
    previous.formId,
    previous.answerEnvelopes,
    wrappedVaultKey,
  );

  return {
    status: 'ready',
    mode: 'edit',
    snapshot: previous.formSnapshot,
    defaultValues: values,
    formId: previous.formId,
    previousSubmissionId: previous.id,
  };
}

async function buildCreateState(
  resolveForm: ResolveFeedbackFormAsync,
  applicationId: string,
  source: FeedbackSubmissionSource,
): Promise<ReadyState> {
  const body = getFeedbackSubmissionSourceBody(source);
  const result = await resolveForm({ applicationId, body });
  const snapshot = result.data.formSnapshot;

  return {
    status: 'ready',
    mode: 'create',
    snapshot,
    defaultValues: buildDefaultValues(snapshot),
    formId: snapshot.formId,
    previousSubmissionId: null,
  };
}

export function useFeedbackSubmissionFlow({
  open,
  applicationId,
  orgId,
  source,
  currentUserId,
  wrappedVaultKey,
}: UseFeedbackSubmissionFlowParams): FeedbackSubmissionFlowResult {
  const { data: submissions, isLoading: isLoadingSubmissions } = useQueryFeedbackSubmissions(
    open ? applicationId : undefined,
    source?.kind === 'event' ? source.eventId : undefined,
  );
  const { mutateAsync: resolveForm } = useResolveFeedbackForm();
  const { ensureUnlocked } = useCryptoUnlock();

  const ownPrevious = useMemo(
    () => findOwnPrevious(submissions, currentUserId, source),
    [submissions, currentUserId, source],
  );

  const editVaultKey = ownPrevious ? wrappedVaultKey : undefined;

  const [state, setState] = useState<FormState>({ status: 'idle' });

  useEffect(() => {
    if (!open) {
      setState({ status: 'idle' });
    }
  }, [open]);

  useEffect(() => {
    if (!open || !source || !currentUserId || isLoadingSubmissions) {
      return;
    }

    let ready: Promise<ReadyState>;

    if (ownPrevious) {
      if (!editVaultKey) {
        return;
      }

      ready = buildEditState(ownPrevious, applicationId, orgId, editVaultKey, ensureUnlocked);
    } else {
      ready = buildCreateState(resolveForm, applicationId, source);
    }

    let cancelled = false;

    setState({ status: 'loading' });

    ready
      .then((next) => {
        if (!cancelled) {
          setState(next);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setState({ status: 'error', message: getErrorMessage(err) });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    open,
    source,
    currentUserId,
    isLoadingSubmissions,
    ownPrevious,
    orgId,
    editVaultKey,
    resolveForm,
    applicationId,
    ensureUnlocked,
  ]);

  const isWaitingForPrerequisites =
    open && source !== null && (!currentUserId || (ownPrevious !== null && !editVaultKey));

  if (state.status === 'ready') {
    return {
      isLoading: false,
      error: null,
      snapshot: state.snapshot,
      defaultValues: state.defaultValues,
      mode: state.mode,
      formId: state.formId,
      previousSubmissionId: state.previousSubmissionId,
    };
  }

  if (state.status === 'error') {
    return {
      isLoading: false,
      error: state.message,
      snapshot: null,
      defaultValues: null,
      mode: null,
      formId: null,
      previousSubmissionId: null,
    };
  }

  return {
    isLoading: isLoadingSubmissions || isWaitingForPrerequisites || state.status === 'loading',
    error: null,
    snapshot: null,
    defaultValues: null,
    mode: null,
    formId: null,
    previousSubmissionId: null,
  };
}

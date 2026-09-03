import { refreshAfterOnchainOperationSettles } from '@comitium/chain/onchain-operation-observer';
import type { PublicEncryptionKey } from '@comitium/crypto';
import { getProductErrorMessage } from '@comitium/ui/product-error-messages';
import { type QueryClient, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { toast } from 'sonner';
import { qk } from '@/hooks/query-keys';
import { archiveApplication, reopenApplication } from '@/lib/api/application-outcomes';
import { getRecipientKey } from '@/lib/api/applications-data';
import { prepareEncryptedEmailDelivery } from '@/lib/applications/communication/email-delivery';
import type { ComposeEmailData } from '@/lib/schemas/emails';

interface ApplicationTerminalActionBase {
  applicationId: string;
  jobId: string;
  orgId: string;
}

interface ArchiveApplicationBase extends ApplicationTerminalActionBase {
  action: 'archive';
  archiveReasonId: string;
}

interface ArchiveApplicationWithoutNotice extends ArchiveApplicationBase {
  notice: null;
}

interface ArchiveApplicationWithNotice extends ArchiveApplicationBase {
  notice: ComposeEmailData;
  applicantEmail: string;
  vaultPublicKey: PublicEncryptionKey;
  vaultKeyVersion: number;
}

interface ReopenApplicationParams extends ApplicationTerminalActionBase {
  action: 'reopen';
  targetStageId?: string;
}

type ApplicationTerminalActionParams =
  | ArchiveApplicationWithoutNotice
  | ArchiveApplicationWithNotice
  | ReopenApplicationParams;

function getApplicationTerminalSuccessMessage(action: ApplicationTerminalActionParams['action']): string {
  if (action === 'reopen') {
    return 'Application reopened';
  }

  return 'Application archived';
}

function getApplicationTerminalErrorMessage(error: unknown, action: ApplicationTerminalActionParams['action']): string {
  if (action === 'reopen') {
    return getProductErrorMessage(error, 'Application could not be reopened. Please try again.');
  }

  return getProductErrorMessage(error, 'Application could not be archived. Please try again.');
}

async function prepareArchiveNotice(params: ArchiveApplicationWithNotice) {
  const recipient = await getRecipientKey(params.applicationId);

  return prepareEncryptedEmailDelivery({
    applicationId: params.applicationId,
    orgId: params.orgId,
    vaultPublicKey: params.vaultPublicKey,
    vaultKeyVersion: params.vaultKeyVersion,
    applicantPublicKey: recipient.publicKey,
    applicantEmail: params.applicantEmail,
    subject: params.notice.subject,
    messageDoc: params.notice.messageDoc,
    messageHtml: params.notice.messageHtml,
  });
}

export function useApplicationTerminalAction({ onCompleted }: { onCompleted: () => void }) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (params: ApplicationTerminalActionParams) => {
      if (params.action === 'reopen') {
        return reopenApplication(params.applicationId, {
          targetStageId: params.targetStageId,
        });
      }

      if (params.notice === null) {
        return archiveApplication(params.applicationId, {
          archiveReasonId: params.archiveReasonId,
          notice: null,
        });
      }

      const delivery = await prepareArchiveNotice(params);

      return archiveApplication(params.applicationId, {
        archiveReasonId: params.archiveReasonId,
        notice: {
          content: delivery.content,
          deliveryGrant: delivery.deliveryGrant,
          emailTemplateId: params.notice.emailTemplateId,
        },
      });
    },
    onMutate: (params) => {
      const message = getApplicationTerminalPendingMessage(params.action);

      toast.loading(message, {
        id: 'application-terminal-action',
      });
    },
    onSuccess: async (result, params) => {
      const stage =
        result.status === 'accepted'
          ? await refreshAfterOnchainOperationSettles(result.operationId, () => undefined)
          : 'completed';

      if (stage === 'failed') {
        toast.error(getApplicationTerminalErrorMessage(new Error('Archive failed'), params.action), {
          id: 'application-terminal-action',
        });

        return;
      }

      await invalidateApplicationOutcomeQueries(queryClient, params);

      if (stage === 'background') {
        toast.info('Archive submitted and is still being finalized.', {
          id: 'application-terminal-action',
        });
        onCompleted();

        return;
      }

      toast.success(getApplicationTerminalSuccessMessage(params.action), {
        id: 'application-terminal-action',
      });
      onCompleted();
    },
    onError: (error: unknown, params) => {
      toast.error(getApplicationTerminalErrorMessage(error, params.action), { id: 'application-terminal-action' });
    },
  });
  const { mutate, isPending } = mutation;

  const run = useCallback(
    (params: ApplicationTerminalActionParams) => {
      mutate(params);
    },
    [mutate],
  );

  return {
    run,
    isPending,
  };
}

function getApplicationTerminalPendingMessage(action: ApplicationTerminalActionParams['action']): string {
  if (action === 'archive') {
    return 'Archiving application...';
  }

  return 'Reopening application...';
}

async function invalidateApplicationOutcomeQueries(
  queryClient: QueryClient,
  params: ApplicationTerminalActionParams,
): Promise<void> {
  const queryKeys = [
    qk.jobs.kanbanRoot(params.jobId),
    qk.jobs.archivedKanban(params.jobId),
    qk.application.detail(params.applicationId),
    qk.application.otherApplications(params.applicationId),
    qk.application.emails(params.applicationId),
    qk.application.feedbackSubmissions(params.applicationId),
    qk.application.interviewProgress(params.applicationId),
    qk.candidate.activityRoot(),
    qk.pipeline.root(),
    qk.jobs.summary(params.jobId),
  ];

  await Promise.all(queryKeys.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
}

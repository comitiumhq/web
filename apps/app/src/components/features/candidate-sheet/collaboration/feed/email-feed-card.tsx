import { type CandidateProfile, formatCandidateName } from '@comitium/schemas/candidates';
import { Card } from '@comitium/ui/card';
import { Skeleton } from '@comitium/ui/skeleton';
import { EnvelopeSimpleIcon } from '@phosphor-icons/react';
import { memo } from 'react';
import { EncryptedPlaceholder } from '@/components/features/encryption/encrypted-placeholder';
import { RichTextEditor } from '@/components/tiptap-ui/rich-text-editor';
import type { ActivityFeedRow, DecryptedEmail, EmailPayload } from '@/lib/schemas/emails';
import { formatRelativeTime, getEmailSender } from '@/lib/utils';

import { getActivityEmailSenderRole } from './activity-email';

type EmailFeedEvent = ActivityFeedRow & { payload: EmailPayload };

interface EmailFeedCardProps {
  event: EmailFeedEvent;
  selectedApplicationId: string | null;
  orgId: string;
  decryptedEmail?: DecryptedEmail;
  isDecrypting: boolean;
  decryptionError: boolean;
  candidateProfile: CandidateProfile | null;
}

export const EmailFeedCard = memo(function EmailFeedCard({
  event,
  selectedApplicationId,
  orgId,
  decryptedEmail,
  isDecrypting,
  decryptionError,
  candidateProfile,
}: EmailFeedCardProps) {
  const senderRole = getActivityEmailSenderRole(event.type);
  const sender = getEmailSender(senderRole, event.actor.name, formatCandidateName(candidateProfile));
  const showJobContext = event.applicationId !== selectedApplicationId;

  return (
    <Card size="sm" className="gap-0 py-0">
      <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
        <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-medium text-muted-foreground">
          {sender.initials}
        </div>

        <div className="flex-1 min-w-0">
          <span className="text-label-13 font-medium">{sender.name}</span>
          {decryptedEmail?.content?.to && (
            <p className="text-label-12 text-muted-foreground truncate">to: {decryptedEmail.content.to}</p>
          )}
          {showJobContext && event.jobTitle && (
            <p className="text-label-12 text-muted-foreground truncate">{event.jobTitle}</p>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <EnvelopeSimpleIcon className="size-3.5 text-muted-foreground" />
          <span className="text-label-12 text-muted-foreground">{formatRelativeTime(event.createdAt)}</span>
        </div>
      </div>

      <div className="px-4 py-3">
        <EmailBody
          orgId={orgId}
          decryptedEmail={decryptedEmail}
          isDecrypting={isDecrypting}
          decryptionError={decryptionError}
        />
      </div>
    </Card>
  );
});

interface EmailBodyProps {
  orgId: string;
  decryptedEmail?: DecryptedEmail;
  isDecrypting: boolean;
  decryptionError: boolean;
}

function EmailBody({ orgId, decryptedEmail, isDecrypting, decryptionError }: EmailBodyProps) {
  if (decryptedEmail?.content) {
    return (
      <>
        <p className="mb-1.5 text-label-13 font-medium">{decryptedEmail.content.subject}</p>
        <div className="text-copy-13 text-muted-foreground">
          <RichTextEditor content={decryptedEmail.content.body} readOnly />
        </div>
      </>
    );
  }

  if (isDecrypting) {
    return <EmailBodySkeleton />;
  }

  if (decryptionError) {
    return <p className="py-1 text-label-12 text-muted-foreground">Email could not be decrypted.</p>;
  }

  return <EncryptedPlaceholder orgId={orgId} variant="block" withBorder={false} lines={3} />;
}

function EmailBodySkeleton() {
  return (
    <div aria-hidden className="py-1">
      <Skeleton className="h-3.5 w-2/5 rounded-md" />
      <Skeleton className="mt-3 h-3 w-full rounded-md" />
      <Skeleton className="mt-2 h-3 w-4/5 rounded-md" />
    </div>
  );
}

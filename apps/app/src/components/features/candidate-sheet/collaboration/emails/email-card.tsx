import { type CandidateProfile, formatCandidateName } from '@comitium/schemas/candidates';
import { Card } from '@comitium/ui/card';
import { Skeleton } from '@comitium/ui/skeleton';
import { EnvelopeSimpleIcon } from '@phosphor-icons/react';
import { memo } from 'react';
import { RichTextEditor } from '@/components/tiptap-ui/rich-text-editor';
import type { DecryptedEmail } from '@/lib/schemas/emails';
import { formatDate, getEmailSender } from '@/lib/utils';

interface EmailCardProps {
  email: DecryptedEmail;
  candidateProfile: CandidateProfile | null;
}

export const EmailCard = memo(function EmailCard({ email, candidateProfile }: EmailCardProps) {
  const sender = getEmailSender(email.senderRole, email.senderName, formatCandidateName(candidateProfile));

  return (
    <Card size="sm" className="gap-0 py-0">
      <div className="flex items-center gap-2.5 border-b border-border px-4 py-2.5">
        <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-medium text-muted-foreground">
          {sender.initials}
        </div>

        <div className="flex-1 min-w-0">
          <span className="text-label-13 font-medium">{sender.name}</span>
          <p className="text-label-12 text-muted-foreground truncate">to: {email.content.to}</p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <EnvelopeSimpleIcon className="size-3.5 text-muted-foreground" />
          <span className="text-label-12 text-muted-foreground">{formatDate(email.createdAt)}</span>
        </div>
      </div>

      <div className="px-4 py-3">
        <p className="text-label-14 font-medium mb-2">{email.content.subject}</p>
        <div className="text-copy-14">
          <RichTextEditor content={email.content.body} readOnly />
        </div>
      </div>
    </Card>
  );
});

export function EmailCardSkeleton() {
  return (
    <Card aria-hidden size="sm" className="gap-0 py-0">
      <div className="flex items-center gap-2.5 border-b border-border px-4 py-2.5">
        <Skeleton className="size-7 shrink-0 rounded-full" />
        <div className="min-w-0 flex-1">
          <Skeleton className="h-3.5 w-28 rounded-md" />
          <Skeleton className="mt-2 h-3 w-44 max-w-full rounded-md" />
        </div>
        <Skeleton className="h-3 w-16 shrink-0 rounded-md" />
      </div>

      <div className="px-4 py-3">
        <Skeleton className="h-3.5 w-2/5 rounded-md" />
        <Skeleton className="mt-3 h-3 w-full rounded-md" />
        <Skeleton className="mt-2 h-3 w-4/5 rounded-md" />
      </div>
    </Card>
  );
}

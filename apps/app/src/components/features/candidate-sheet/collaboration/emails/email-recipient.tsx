import { useQueryOrg } from '@/hooks/queries/use-query-org';
import type { DecryptedEmail } from '@/lib/schemas/emails';

interface EmailRecipientProps {
  orgId: string;
  senderRole: DecryptedEmail['senderRole'];
  to?: string;
}

export function EmailRecipient({ orgId, senderRole, to }: EmailRecipientProps) {
  const { data: organization } = useQueryOrg(orgId);
  const recipient = senderRole === 'applicant' ? organization?.name || 'Hiring team' : to;

  return recipient ? (
    <p className="text-label-12 text-meta-foreground truncate" title={recipient}>
      to: {recipient}
    </p>
  ) : null;
}

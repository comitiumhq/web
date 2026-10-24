import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@comitium/ui/collapsible';
import { formatRelativeTime } from '@comitium/ui/date';
import { getMemberDisplayName, type MemberDisplayIdentity } from '@comitium/ui/display-name';
import { ChevronDownIcon } from 'lucide-react';
import { memo, useState } from 'react';
import { MemberAvatar } from '@/components/user/member-avatar';
import type { FeedbackSubmission } from '@/lib/schemas/feedback-submissions';
import { isDefined } from '@/lib/utils';

import { SubmissionActions } from './submission-actions';
import type { DecryptedEntry } from './types';
import { EntryBody } from './values-view';

interface SubmittedRowProps {
  submission: FeedbackSubmission;
  identity: MemberDisplayIdentity;
  entry: DecryptedEntry;
  applicationId: string | null;
  orgId: string;
  isOwn: boolean;
  onEdit: (() => void) | null;
}

export const SubmittedRow = memo(function SubmittedRow({
  submission,
  identity,
  entry,
  applicationId,
  orgId,
  isOwn,
  onEdit,
}: SubmittedRowProps) {
  const [open, setOpen] = useState(false);
  const hasActions = isOwn && (isDefined(onEdit) || isDefined(applicationId));
  const authorName = getMemberDisplayName(identity);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="relative">
        <CollapsibleTrigger
          type="button"
          aria-label={`${open ? 'Collapse' : 'Expand'} feedback from ${authorName}`}
          className="group/feedback flex w-full items-center gap-2 px-4 py-2.5 text-left outline-none transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/50"
        >
          <MemberAvatar identity={identity} size="sm" className="shrink-0" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-label-13 font-medium">{authorName}</span>
            <span className="block text-label-12 text-muted-foreground">
              {formatRelativeTime(submission.submittedAt)}
            </span>
          </span>

          {hasActions && <span aria-hidden className="w-8 shrink-0" />}

          <ChevronDownIcon
            aria-hidden
            className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-aria-expanded/feedback:rotate-180 motion-reduce:transition-none"
          />
        </CollapsibleTrigger>

        {hasActions && <SubmissionActions applicationId={applicationId} submissionId={submission.id} onEdit={onEdit} />}
      </div>

      <CollapsibleContent className="overflow-hidden [--radix-accordion-content-height:var(--radix-collapsible-content-height)] [animation-duration:200ms]! [animation-timing-function:cubic-bezier(0.4,0,0.2,1)]! data-closed:animate-accordion-up data-open:animate-accordion-down motion-reduce:animate-none!">
        <div className="border-t border-separator bg-muted/30 px-4 pb-4 pt-1">
          <EntryBody
            entry={entry}
            snapshot={submission.formSnapshot}
            canReadPrivate={submission.canReadPrivate}
            orgId={orgId}
          />
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
});

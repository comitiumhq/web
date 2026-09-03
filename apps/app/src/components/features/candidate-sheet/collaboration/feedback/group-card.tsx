import { Card } from '@comitium/ui/card';
import type { MemberDisplayIdentity } from '@comitium/ui/display-name';
import { useMemo } from 'react';
import type { useQueryOrgTeamMap } from '@/hooks/queries/use-query-org-team';
import type { InterviewEventRef } from '@/lib/interviews/feedback';
import type { ApplicationReviewActivity } from '@/lib/schemas/stage-activities';

import { AddMyFeedbackRow } from './add-my-feedback-row';
import { itemKey } from './group-builder';
import { PendingReviewerRow } from './pending-reviewer-row';
import { SubmittedRow } from './submitted-row';
import type { DecryptedEntry, SourceGroup, SourceGroupItem } from './types';

interface GroupCardProps {
  group: SourceGroup;
  applicationId: string | null;
  orgId: string;
  decryptedMap: Map<string, DecryptedEntry>;
  memberMap: ReturnType<typeof useQueryOrgTeamMap>;
  currentUserId: string;
  onReviewActivity: ((activity: ApplicationReviewActivity) => void) | null;
  onSubmitInterviewFeedback: ((event: InterviewEventRef) => void) | null;
}

export function GroupCard({
  group,
  applicationId,
  orgId,
  decryptedMap,
  memberMap,
  currentUserId,
  onReviewActivity,
  onSubmitInterviewFeedback,
}: GroupCardProps) {
  const submitForGroup = useMemo(
    () => buildGroupSubmitHandler(group, onReviewActivity, onSubmitInterviewFeedback),
    [group, onReviewActivity, onSubmitInterviewFeedback],
  );

  return (
    <Card size="sm" className="gap-0 py-0">
      <header className="border-b border-border px-4 py-2.5">
        <p className="text-label-13 font-medium">{group.title}</p>
        {group.subtitle && <p className="text-label-12 text-muted-foreground mt-0.5">{group.subtitle}</p>}
      </header>

      <ul className="divide-y divide-border">
        {group.items.map((item, idx) => (
          <li key={itemKey(item, idx)}>
            <GroupItem
              item={item}
              applicationId={applicationId}
              orgId={orgId}
              decryptedMap={decryptedMap}
              memberMap={memberMap}
              currentUserId={currentUserId}
              onSubmit={submitForGroup}
            />
          </li>
        ))}
      </ul>
    </Card>
  );
}

interface GroupItemProps {
  item: SourceGroupItem;
  applicationId: string | null;
  orgId: string;
  decryptedMap: Map<string, DecryptedEntry>;
  memberMap: ReturnType<typeof useQueryOrgTeamMap>;
  currentUserId: string;
  onSubmit: (() => void) | null;
}

function GroupItem({ item, applicationId, orgId, decryptedMap, memberMap, currentUserId, onSubmit }: GroupItemProps) {
  if (item.kind === 'submitted') {
    const submission = item.submission;
    const member = submission.submittedByUserId ? memberMap.get(submission.submittedByUserId) : undefined;
    const identity: MemberDisplayIdentity = member ?? { name: 'Former member' };
    const isOwn = submission.submittedByUserId === currentUserId;

    return (
      <SubmittedRow
        submission={submission}
        identity={identity}
        entry={decryptedMap.get(submission.id) ?? { status: 'loading' }}
        applicationId={applicationId}
        orgId={orgId}
        isOwn={isOwn}
        onEdit={onSubmit}
      />
    );
  }

  if (item.kind === 'pending-reviewer') {
    const member = memberMap.get(item.userId);
    const identity: MemberDisplayIdentity = member ?? { name: 'Former member' };
    const isMe = item.userId === currentUserId;

    return <PendingReviewerRow identity={identity} isMe={isMe} canSubmit={item.canSubmit} onSubmit={onSubmit} />;
  }

  return <AddMyFeedbackRow onSubmit={onSubmit} />;
}

function buildGroupSubmitHandler(
  group: SourceGroup,
  onReviewActivity: ((activity: ApplicationReviewActivity) => void) | null,
  onSubmitInterviewFeedback: ((event: { id: string; title: string }) => void) | null,
): (() => void) | null {
  if (group.kind === 'ar' && onReviewActivity) {
    const activity = group.activity;

    return () => onReviewActivity(activity);
  }

  if (group.kind === 'event' && onSubmitInterviewFeedback) {
    const ref: InterviewEventRef = { id: group.eventId, title: group.interviewTitle };

    return () => onSubmitInterviewFeedback(ref);
  }

  return null;
}

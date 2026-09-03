import { EmptyState } from '@comitium/ui/empty-state';
import { PageHeader } from '@comitium/ui/page-header';
import { WarningCircleIcon } from '@phosphor-icons/react';
import { useCallback, useState } from 'react';
import { useOrgTreasury } from '@/hooks/queries/use-org-treasury';
import type { MyOrg } from '@/hooks/queries/use-query-my-orgs';
import { useQueryOrgInvites } from '@/hooks/queries/use-query-org-invites';
import { useQueryOrgTeam } from '@/hooks/queries/use-query-org-team';
import { usePermissions } from '@/hooks/use-permissions';
import { Permission } from '@/lib/schemas/org';

import { InviteSheet } from './invites/invite-sheet';
import { MemberPermissionsSheet } from './member-permissions';
import { TeamTable } from './members/team-table';

interface TeamManagementProps {
  org: MyOrg;
}

export function TeamManagement({ org }: TeamManagementProps) {
  const { can } = usePermissions();
  const canManageTeam = can(Permission.ORG_MEMBER_WRITE);
  const { data: members, isLoading, error } = useQueryOrgTeam(org.id);
  const { data: invites } = useQueryOrgInvites(canManageTeam ? org.id : undefined);
  const { treasury } = useOrgTreasury(org.id);
  const currentTreasury = treasury?.currentTreasury ?? null;
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const openInviteDialog = useCallback(() => {
    setInviteDialogOpen(true);
  }, []);

  const handleSelectMember = useCallback((userId: string) => {
    setSelectedUserId(userId);
  }, []);

  const handleMemberSheetOpenChange = useCallback((open: boolean) => {
    if (!open) {
      setSelectedUserId(null);
    }
  }, []);

  if (error) {
    return (
      <div className="flex h-full items-center justify-center pb-8">
        <EmptyState icon={WarningCircleIcon} title="Failed to load members" description={error.message} />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-8">
      <PageHeader title="Members" />

      <section className="flex min-h-0 flex-1 flex-col gap-4">
        <TeamTable
          orgId={org.id}
          members={members ?? []}
          invites={canManageTeam ? (invites ?? []) : []}
          canManageTeam={canManageTeam}
          isLoading={isLoading}
          onInviteClick={openInviteDialog}
          onSelectMember={handleSelectMember}
        />
      </section>

      <MemberPermissionsSheet
        org={org}
        userId={selectedUserId}
        currentTreasury={currentTreasury}
        onOpenChange={handleMemberSheetOpenChange}
      />

      {canManageTeam && <InviteSheet orgId={org.id} open={inviteDialogOpen} onOpenChange={setInviteDialogOpen} />}
    </div>
  );
}

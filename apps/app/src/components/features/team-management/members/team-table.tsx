import { Badge } from '@comitium/ui/badge';
import { Button } from '@comitium/ui/button';
import {
  DATA_TABLE_CLASS,
  DATA_TABLE_SCROLL_AREA_CLASS,
  DataTable,
  type DataTableColumn,
} from '@comitium/ui/data-table';
import { EmptyStateCard } from '@comitium/ui/empty-state-card';
import { Tabs, TabsList, TabsTrigger } from '@comitium/ui/tabs';
import { UsersIcon } from '@phosphor-icons/react';
import { memo, type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import type { OrgTeamMember } from '@/hooks/queries/use-query-org-team';
import type { OrgInvite } from '@/lib/schemas/org';

import { InviteRow } from '../invites/invite-row';
import { MemberRow } from './member-row';
import { TeamTableSkeleton } from './team-table-skeleton';

type TabValue = 'active' | 'pending' | 'deactivated';

const MEMBER_COLUMNS: DataTableColumn[] = [
  { id: 'member', header: 'Member' },
  { id: 'role', header: 'Role' },
  { id: 'access', header: 'Access' },
];

const INVITE_COLUMNS: DataTableColumn[] = [
  { id: 'invite', header: 'Pending invite' },
  { id: 'delivery', header: 'Delivery' },
  { id: 'expires', header: 'Expires' },
  { id: 'actions', header: 'Actions', className: 'text-right' },
];

interface TeamTableProps {
  orgId: string;
  members: OrgTeamMember[];
  invites: OrgInvite[];
  canManageTeam: boolean;
  isLoading: boolean;
  onInviteClick: () => void;
  onSelectMember: (userId: string) => void;
}

export const TeamTable = memo(function TeamTable({
  orgId,
  members,
  invites,
  canManageTeam,
  isLoading,
  onInviteClick,
  onSelectMember,
}: TeamTableProps) {
  const [tab, setTab] = useState<TabValue>('active');
  const activeMembers = useMemo(() => members.filter((member) => member.isActive), [members]);
  const deactivatedMembers = useMemo(() => members.filter((member) => !member.isActive), [members]);
  const showDeactivatedTab = deactivatedMembers.length > 0;
  const shownMembers = tab === 'deactivated' ? deactivatedMembers : activeMembers;
  const handleTabChange = useCallback((value: string) => setTab(value as TabValue), []);
  const memberRows = useMemo(
    () => shownMembers.map((member) => <MemberRow key={member.userId} member={member} onSelect={onSelectMember} />),
    [shownMembers, onSelectMember],
  );
  const inviteRows = useMemo(
    () => invites.map((invite) => <InviteRow key={invite.id} orgId={orgId} invite={invite} />),
    [invites, orgId],
  );

  useEffect(() => {
    if (tab === 'pending' && !canManageTeam) {
      setTab('active');

      return;
    }

    if (tab === 'deactivated' && !showDeactivatedTab) {
      setTab('active');
    }
  }, [tab, canManageTeam, showDeactivatedTab]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <MembersToolbar
        tab={tab}
        onTabChange={handleTabChange}
        activeCount={activeMembers.length}
        pendingCount={invites.length}
        deactivatedCount={deactivatedMembers.length}
        showPendingTab={canManageTeam}
        showDeactivatedTab={showDeactivatedTab}
        canManageTeam={canManageTeam}
        isLoading={isLoading}
        onInviteClick={onInviteClick}
      />

      <div className="flex min-h-0 flex-1 flex-col">
        <TeamTableContent
          tab={tab}
          isLoading={isLoading}
          memberRows={memberRows}
          inviteRows={inviteRows}
          shownMemberCount={shownMembers.length}
          pendingCount={invites.length}
        />
      </div>
    </div>
  );
});

interface MembersToolbarProps {
  tab: TabValue;
  onTabChange: (value: string) => void;
  activeCount: number;
  pendingCount: number;
  deactivatedCount: number;
  showPendingTab: boolean;
  showDeactivatedTab: boolean;
  canManageTeam: boolean;
  isLoading: boolean;
  onInviteClick: () => void;
}

function MembersToolbar({
  tab,
  onTabChange,
  activeCount,
  pendingCount,
  deactivatedCount,
  showPendingTab,
  showDeactivatedTab,
  canManageTeam,
  isLoading,
  onInviteClick,
}: MembersToolbarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Tabs value={tab} onValueChange={onTabChange}>
        <TabsList variant="line">
          <TabsTrigger value="active">
            Active <Badge variant="secondary">{activeCount}</Badge>
          </TabsTrigger>
          {showPendingTab && (
            <TabsTrigger value="pending">
              Pending <Badge variant="secondary">{pendingCount}</Badge>
            </TabsTrigger>
          )}
          {showDeactivatedTab && (
            <TabsTrigger value="deactivated">
              Deactivated <Badge variant="secondary">{deactivatedCount}</Badge>
            </TabsTrigger>
          )}
        </TabsList>
      </Tabs>

      {canManageTeam && (
        <Button size="sm" onClick={onInviteClick} disabled={isLoading}>
          Invite member
        </Button>
      )}
    </div>
  );
}

interface TeamTableContentProps {
  tab: TabValue;
  isLoading: boolean;
  memberRows: ReactNode;
  inviteRows: ReactNode;
  shownMemberCount: number;
  pendingCount: number;
}

function TeamTableContent({
  tab,
  isLoading,
  memberRows,
  inviteRows,
  shownMemberCount,
  pendingCount,
}: TeamTableContentProps) {
  if (isLoading) {
    return <TeamTableSkeleton className={DATA_TABLE_CLASS} scrollAreaClassName={DATA_TABLE_SCROLL_AREA_CLASS} />;
  }

  if (tab === 'pending') {
    if (pendingCount === 0) {
      return (
        <EmptyStateCard
          icon={UsersIcon}
          title="No pending invites"
          description="Invites waiting for acceptance will appear here."
        />
      );
    }

    return (
      <DataTable
        columns={INVITE_COLUMNS}
        className={DATA_TABLE_CLASS}
        scrollAreaClassName={DATA_TABLE_SCROLL_AREA_CLASS}
      >
        {inviteRows}
      </DataTable>
    );
  }

  if (shownMemberCount === 0) {
    return <EmptyMembersState tab={tab} />;
  }

  return (
    <DataTable columns={MEMBER_COLUMNS} className={DATA_TABLE_CLASS} scrollAreaClassName={DATA_TABLE_SCROLL_AREA_CLASS}>
      {memberRows}
    </DataTable>
  );
}

function EmptyMembersState({ tab }: { tab: TabValue }) {
  if (tab === 'deactivated') {
    return (
      <EmptyStateCard
        icon={UsersIcon}
        title="No deactivated members"
        description="Members removed from active access will appear here."
      />
    );
  }

  return (
    <EmptyStateCard
      icon={UsersIcon}
      title="No active members yet"
      description="Accepted members with active organization access will appear here."
    />
  );
}
